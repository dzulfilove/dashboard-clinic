import dotenv from 'dotenv';
// Load environment variables must be the very first step
dotenv.config();

import express from 'express';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { db, initializeDatabase, readVirtualDb, writeVirtualDb, runMigrationScript } from './src/db/connection.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'klinik_puri_medika_fallback_secure_key_2026';

const BASEROW_API_TOKEN = process.env.BASEROW_API_TOKEN;
const BASEROW_TABLE_URL = process.env.BASEROW_TABLE_URL;
const BASEROW_BASE_URL = process.env.BASEROW_BASE_URL;

// Middelewares
app.use(cors());
app.use(express.json());

// Initialize Database (real VPS MySQL or fall back to virtual DB)
initializeDatabase().then(async (dbStatus) => {
  console.log(`Database initialized in mode: ${dbStatus.status}`);
});

// Middleware for JWT Authenticative verification
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(401).json({ message: 'Token tidak valid atau telah kedaluwarsa.' });
    req.user = user;
    next();
  });
};

// Middleware for Role Guarding
const roleGuard = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak. Role Anda tidak memiliki izin.' });
    };
    next();
  };
};

// Helper to extract role cleanly from Baserow multiple select or text fields
function helperExtractRole(peranField: any, divisiField: any): string {
  let rolesStr = '';
  if (peranField) {
    if (Array.isArray(peranField)) {
      rolesStr = peranField.map((r: any) => {
        if (r && typeof r === 'object') {
          return r.value || r.name || JSON.stringify(r);
        }
        return String(r);
      }).join(' ');
    } else if (typeof peranField === 'string') {
      rolesStr = peranField;
    } else if (typeof peranField === 'object' && peranField !== null) {
      rolesStr = peranField.value || peranField.name || JSON.stringify(peranField);
    } else {
      rolesStr = String(peranField);
    }
  }

  let divStr = '';
  if (divisiField) {
    if (Array.isArray(divisiField)) {
      divStr = divisiField.map((r: any) => {
        if (r && typeof r === 'object') {
          return r.value || r.name || JSON.stringify(r);
        }
        return String(r);
      }).join(' ');
    } else if (typeof divisiField === 'string') {
      divStr = divisiField;
    } else if (typeof divisiField === 'object' && divisiField !== null) {
      divStr = divisiField.value || divisiField.name || JSON.stringify(divisiField);
    } else {
      divStr = String(divisiField);
    }
  }

  const combined = (rolesStr + ' ' + divStr).trim().toLowerCase();

  if (combined.includes('admin') || combined.includes('it') || combined.includes('developer') || combined.includes('owner')) {
    return 'admin';
  } else if (combined.includes('perawat')) {
    return 'perawat';
  } else if (combined.includes('analis') || combined.includes('analyst') || combined.includes('lab') || combined.includes('laboratorium')) {
    return 'analis';
  } else if (combined.includes('farmasi') || combined.includes('apotek') || combined.includes('apoteker')) {
    return 'farmasi';
  }

  return rolesStr.trim().toLowerCase() || 'admin';
}

/* ==================== 1. DIAGNOSTIC SERVICES ==================== */

app.get('/api/db/status', async (req, res) => {
  const status = db.getDiagnosticStatus();
  res.json(status);
});

app.post('/api/db/test-connection', async (req, res) => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE || process.env.DB_NAME;
  const port = Number(process.env.DB_PORT || 3306);

  if (!host || !user || !database) {
    return res.json({ 
      success: false, 
      message: 'Koneksi gagal: Variabel environment MySQL (DB_HOST, DB_USER, DB_DATABASE) belum dikonfigurasi di file .env server.' 
    });
  }

  try {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.default.createConnection({
      host,
      user,
      password,
      database,
      port,
      connectTimeout: 5000,
    });
    await connection.query('SELECT 1');
    await connection.end();
    res.json({ success: true, message: `Koneksi ke VPS MySQL (${host}:${port}) berhasil!` });
  } catch (err: any) {
    res.json({ success: false, message: `Gagal menghubungkan ke VPS MySQL (${host}:${port}): ${err.message}` });
  }
});

app.post('/api/db/run-migrations', async (req, res) => {
  const status = db.getDiagnosticStatus();
  if (status.isVirtual) {
    return res.status(400).json({ success: false, message: 'Fitur migrasi hanya dapat dilakukan pada VPS MySQL.' });
  }
  try {
    const { cleanReset } = req.body;
    const result = await runMigrationScript({ cleanReset: !!cleanReset });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal menjalankan migrasi: ${err.message}` });
  }
});


/* ==================== 2. AUTHENTICATION SERVICES ==================== */

// Helper to send email OTP using Nodemailer
async function sendOTPEmail(toEmail: string, otpCode: string, name: string): Promise<{ sent: boolean; messageUrl?: string; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Klinik Puri Medika" <no-reply@purimedika.com>';

  if (!user || !pass) {
    console.warn('SMTP_USER atau SMTP_PASS tidak terdefinisi di file .env. Mengirimkan OTP simulasi ke konsol.');
    return { sent: true, messageUrl: 'Simulated Console Log Delivery' };
  }

  try {
    let transporter;
    if (host) {
      // Use configured custom SMTP
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    } else {
      // Use Gmail SMTP service with the provided credentials
      console.log(`Using Gmail SMTP delivery via ${user}`);
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    }
    
    const mailOptions = {
      from,
      to: toEmail,
      subject: `[Klinik Puri Medika] Kode OTP Keamanan Login Anda`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px;">
            <h1 style="color: #0f766e; margin: 0; font-size: 24px;">Klinik Puri Medika</h1>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Otentikasi Keamanan Sistem</p>
          </div>
          <p style="font-size: 16px; color: #1e293b; margin-bottom: 10px;">Halo <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">Kami telah menerima permintaan kode akses masuk untuk Akun Anda. Silakan masukkan kode OTP di bawah ini untuk memverifikasi identitas Anda dan masuk ke sistem:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 15px 40px; border-radius: 12px; font-family: monospace;">
              ${otpCode}
            </div>
          </div>
          <p style="font-size: 13px; color: #ef4444; font-weight: 500;">PENTING: Kode OTP ini bersifat rahasia dan hanya berlaku selama 10 menit. Jangan membagikan kode ini kepada siapa pun demi menjaga keamanan data klinik.</p>
          <hr style="border: 0; border-top: 1px dashed #e2e8f0; margin: 25px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Pesan ini dikirimkan otomatis oleh sistem Klinik Puri Medika. Harap tidak membalas email ini.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { sent: true };
  } catch (error: any) {
    console.error('sendOTPEmail error logic:', error);
    return { sent: false, error: error.message };
  }
}

app.post('/api/auth/send-otp', async (req: any, res: any) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email wajib diisi.' });
  }

  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable (silakan definisikan BASEROW_API_TOKEN, BASEROW_TABLE_URL, dan BASEROW_BASE_URL).'
    });
  }

  try {
    // Fetch all rows from Baserow table 936
    const url = BASEROW_TABLE_URL;
    let userRow;
    let usersFromVirtual: any[] = [];
    let isVirtual = false;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Token ${BASEROW_API_TOKEN}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      const rows = response.data.results || [];
      userRow = rows.find((r: any) => r.Email && r.Email.toLowerCase().trim() === email.toLowerCase().trim());
    } catch (err: any) {
      console.warn('Baserow connection failed, falling back to virtual_db.json for users:', err.message);
      isVirtual = true;
      const vdb = readVirtualDb();
      usersFromVirtual = vdb.users || [];
      userRow = usersFromVirtual.find((u: any) => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
    }

    if (!userRow) {
      return res.status(404).json({ message: 'Alamat email tidak terdaftar.' });
    }

    const userName = userRow['Nama Karyawan'] || userRow.nama || 'Karyawan Puri Medika';

    // Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiry to 10 minutes from now
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    if (!isVirtual) {
       // Update Baserow row matching userRow.id
       const patchUrl = `${BASEROW_BASE_URL}/${userRow.id}/?user_field_names=true`;
       await axios.patch(patchUrl, {
         'OTP 2': otp,
         'OTP 2 Expired': expiry
       }, {
         headers: {
           'Authorization': `Token ${BASEROW_API_TOKEN}`,
           'Content-Type': 'application/json'
         }
       });
    } else {
       // Update virtual_db user
       const vdb = readVirtualDb();
       const uIdx = vdb.users.findIndex((u: any) => u.email === userRow.email);
       if (uIdx !== -1) {
         vdb.users[uIdx]['OTP_2'] = otp;
         vdb.users[uIdx]['OTP_2_Expired'] = expiry;
         writeVirtualDb(vdb);
       }
    }

    // Send the email via Nodemailer
    const emailRes = await sendOTPEmail(email.toLowerCase().trim(), otp, userName);

    res.json({
      success: true,
      message: emailRes.messageUrl 
        ? `Kode OTP berhasil diperbarui & dikirimkan ke email simulasi.`
        : `Kode OTP berhasil dikirim ke email: ${email}`,
      debugOtp: otp, // still included for easy fallback testing/verification
      emailPreviewUrl: emailRes.messageUrl || null
    });

  } catch (err: any) {
    console.error('Baserow send-otp error:', err.response?.data || err.message);
    res.status(500).json({ 
      message: `Gagal mengirimkan OTP: ${err.response?.data?.message || err.message}` 
    });
  }
});

app.post('/api/auth/verify-otp', async (req: any, res: any) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email dan Kode OTP wajib diisi.' });
  }

  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable (silakan definisikan BASEROW_API_TOKEN, BASEROW_TABLE_URL, dan BASEROW_BASE_URL).'
    });
  }

  try {
    // Fetch all rows from Baserow table 936
    const url = BASEROW_TABLE_URL;
    let userRow;
    let isVirtual = false;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Token ${BASEROW_API_TOKEN}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      const rows = response.data.results || [];
      userRow = rows.find((r: any) => r.Email && r.Email.toLowerCase().trim() === email.toLowerCase().trim());
    } catch (err: any) {
      console.warn('Baserow connection failed, falling back to virtual_db.json for users:', err.message);
      isVirtual = true;
      const vdb = readVirtualDb();
      userRow = (vdb.users || []).find((u: any) => u.email && u.email.toLowerCase().trim() === email.toLowerCase().trim());
    }

    if (!userRow) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const savedOtp = (isVirtual ? userRow['OTP_2'] : userRow['OTP 2']) ? String(isVirtual ? userRow['OTP_2'] : userRow['OTP 2']).trim() : '';
    const expiryStr = isVirtual ? userRow['OTP_2_Expired'] : userRow['OTP 2 Expired'];

    if (!savedOtp || savedOtp !== String(otp).trim()) {
      return res.status(401).json({ message: 'Kode OTP yang dimasukkan tidak cocok.' });
    }

    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      if (expiryDate.getTime() < Date.now()) {
        return res.status(401).json({ message: 'Kode OTP telah kedaluwarsa. Silakan minta ulang.' });
      }
    }

    // Use ID, Name, and Role entirely determined from the active row
    const localUserId = Number(userRow.id || 100 + Math.floor(Math.random() * 100));
    const localUserName = userRow['Nama Karyawan'] || userRow.nama || 'Karyawan Puri Medika';
    
    // Determine role cleanly using helper
    const localUserRole = helperExtractRole(
      isVirtual ? userRow.role : userRow.Peran,
      isVirtual ? '' : userRow.Divisi
    );

    // Sign JWT
    const token = jwt.sign(
      { id: localUserId, nama: localUserName, email: email.toLowerCase().trim(), role: localUserRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Optional: clear OTP in Baserow/VDB to make it single-use
    if (!isVirtual) {
       const patchUrl = `${BASEROW_BASE_URL}/${userRow.id}/?user_field_names=true`;
       await axios.patch(patchUrl, {
         'OTP 2': '',
         'OTP 2 Expired': null
       }, {
         headers: {
           'Authorization': `Token ${BASEROW_API_TOKEN}`,
           'Content-Type': 'application/json'
         }
       }).catch((e: any) => console.warn('Failed to clean OTP 2 in Baserow:', e.message));
    } else {
       const vdb = readVirtualDb();
       const uIdx = vdb.users.findIndex((u: any) => u.email === userRow.email);
       if (uIdx !== -1) {
         vdb.users[uIdx]['OTP_2'] = '';
         vdb.users[uIdx]['OTP_2_Expired'] = null;
         writeVirtualDb(vdb);
       }
    }

    res.json({
      token,
      user: {
        id: localUserId,
        nama: localUserName,
        email: email.toLowerCase().trim(),
        role: localUserRole
      }
    });

  } catch (err: any) {
    console.error('Baserow verify-otp error:', err);
    res.status(550).json({ message: `Gagal memverifikasi OTP: ${err.message}` });
  }
});

// Retrocompatible route for login
app.post('/api/auth/login', async (req: any, res: any) => {
  res.status(400).json({ message: 'Aplikasi ini menggunakan login berbasis OTP. Silakan gunakan portal kirim-otp.' });
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    // Return parameters straight from the token context (Baserow source)
    res.json({
      id: req.user.id,
      nama: req.user.nama,
      email: req.user.email,
      role: req.user.role,
      created_at: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Berhasil keluar.' });
});


/* ==================== 3. LABORATORY ENDPOINTS ==================== */

app.get('/api/lab/parameter', authenticateToken, async (req, res) => {
  const all = req.query.all === 'true';
  try {
    const sql = all 
      ? 'SELECT * FROM lab_parameter'
      : 'SELECT * FROM lab_parameter WHERE is_active = 1';
    const params = await db.query(sql);
    res.json(params);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Admin/Lab: Create parameter
app.post('/api/lab/parameter', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req: any, res) => {
  const { kategori, nama_parameter } = req.body;
  if (!kategori || !nama_parameter) {
    return res.status(400).json({ message: 'Kategori dan nama parameter wajib diisi.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO lab_parameter (kategori, nama_parameter, is_active) VALUES (?, ?, 1)',
      [String(kategori).toUpperCase().trim(), String(nama_parameter).trim()]
    );
    res.json({ success: true, message: 'Parameter berhasil ditambahkan.', id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Admin/Lab: Update parameter
app.put('/api/lab/parameter/:id', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  const { kategori, nama_parameter, is_active } = req.body;
  if (!kategori || !nama_parameter) {
    return res.status(400).json({ message: 'Kategori dan nama parameter wajib diisi.' });
  }
  try {
    await db.query(
      'UPDATE lab_parameter SET kategori = ?, nama_parameter = ?, is_active = ? WHERE id = ?',
      [String(kategori).toUpperCase().trim(), String(nama_parameter).trim(), is_active !== undefined ? Number(is_active) : 1, Number(id)]
    );
    res.json({ success: true, message: 'Parameter berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Admin/Lab: Delete/Deactivate parameter
app.delete('/api/lab/parameter/:id', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.query('UPDATE lab_parameter SET is_active = 0 WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Parameter berhasil dinonaktifkan.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Get daily or monthly aggregated lab volumes or a custom month range
app.get('/api/lab/data', authenticateToken, async (req, res) => {
  const { tanggal, bulan, tahun, start_bulan, start_tahun, end_bulan, end_tahun } = req.query;
  try {
    if (tanggal) {
      // Get daily entries
      const rows = await db.query(
        'SELECT d.*, p.nama_parameter, p.kategori FROM lab_data_harian d JOIN lab_parameter p ON d.parameter_id = p.id WHERE d.tanggal = ?',
        [String(tanggal)]
      );
      res.json(rows);
    } else if (start_bulan && start_tahun && end_bulan && end_tahun) {
      // Get monthly aggregated values across custom range
      const startDay = '01';
      const lastDay = new Date(Number(end_tahun), Number(end_bulan), 0).getDate();
      const startDate = `${start_tahun}-${String(start_bulan).padStart(2, '0')}-${startDay}`;
      const endDate = `${end_tahun}-${String(end_bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const rows = await db.query(
        'SELECT SUM(d.jumlah) as jumlah, d.parameter_id, p.nama_parameter, p.kategori FROM lab_data_harian d JOIN lab_parameter p ON d.parameter_id = p.id WHERE d.tanggal BETWEEN ? AND ? GROUP BY d.parameter_id, p.nama_parameter, p.kategori',
        [startDate, endDate]
      );
      // Map to quantities interface
      const formatted = rows.map((r: any) => ({
        parameter_id: r.parameter_id,
        jumlah: Number(r.jumlah || 0),
        nama_parameter: r.nama_parameter,
        kategori: r.kategori
      }));
      res.json(formatted);
    } else if (bulan && tahun) {
      // Get monthly aggregated values for a single month
      const rows = await db.query(
        'SELECT SUM(d.jumlah) as jumlah, d.parameter_id, p.nama_parameter, p.kategori FROM lab_data_harian d JOIN lab_parameter p ON d.parameter_id = p.id WHERE MONTH(d.tanggal) = ? AND YEAR(d.tanggal) = ? GROUP BY d.parameter_id, p.nama_parameter, p.kategori',
        [Number(bulan), Number(tahun)]
      );
      // Map to quantities interface
      const formatted = rows.map((r: any) => ({
        parameter_id: r.parameter_id,
        jumlah: Number(r.jumlah || 0),
        nama_parameter: r.nama_parameter,
        kategori: r.kategori
      }));
      res.json(formatted);
    } else {
      res.json([]);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Save or Update bulk daily parameters
app.post('/api/lab/data', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req: any, res) => {
  const { tanggal, data } = req.body; // data: [{ parameter_id, jumlah }]
  if (!tanggal || !Array.isArray(data)) {
    return res.status(400).json({ message: 'Data tanggal dan parameter pemeriksaan tidak lengkap.' });
  }

  try {
    for (const item of data) {
      await db.query(
        'INSERT INTO lab_data_harian (parameter_id, tanggal, jumlah, input_by) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE jumlah = VALUES(jumlah), input_by = VALUES(input_by)',
        [Number(item.parameter_id), String(tanggal), Number(item.jumlah || 0), req.user.id]
      );
    }
    res.json({ success: true, message: 'Data harian laboratorium berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Edit single daily lab record
app.put('/api/lab/data/:id', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  const { jumlah } = req.body;
  try {
    const status = db.getDiagnosticStatus();
    if (status.isVirtual) {
      const vdb = readVirtualDb();
      const idx = (vdb.lab_data_harian || []).findIndex(x => x.id === Number(id));
      if (idx !== -1) {
        vdb.lab_data_harian![idx].jumlah = Number(jumlah);
        vdb.lab_data_harian![idx].input_by = req.user.id;
        writeVirtualDb(vdb);
        return res.json({ success: true, message: 'Data berhasil diperbarui.' });
      }
      return res.status(404).json({ message: 'Data tidak ditemukan.' });
    }

    await db.query('UPDATE lab_data_harian SET jumlah = ?, input_by = ? WHERE id = ?', [Number(jumlah), req.user.id, Number(id)]);
    res.json({ success: true, message: 'Data berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/lab/rekap', authenticateToken, async (req, res) => {
  const { bulan, tahun } = req.query;
  try {
    const queryStr = `
      SELECT p.kategori, SUM(d.jumlah) as total
      FROM lab_data_harian d
      JOIN lab_parameter p ON d.parameter_id = p.id
      WHERE MONTH(d.tanggal) = ? AND YEAR(d.tanggal) = ?
      GROUP BY p.kategori
    `;
    const rows = await db.query(queryStr, [Number(bulan), Number(tahun)]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Lab 12 Month Trend charts
app.get('/api/lab/tren', authenticateToken, async (req, res) => {
  try {
    const rows = await db.query(
      `SELECT MONTH(d.tanggal) as bulan, YEAR(d.tanggal) as tahun, SUM(d.jumlah) as total, p.kategori
       FROM lab_data_harian d
       JOIN lab_parameter p ON d.parameter_id = p.id
       GROUP BY YEAR(d.tanggal), MONTH(d.tanggal), p.kategori`
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Granular daily parameter trends to track data entry progress per exam type
app.get('/api/lab/parameter-harian', authenticateToken, async (req, res) => {
  const { start_bulan, start_tahun, end_bulan, end_tahun } = req.query;
  try {
    const sB = Number(start_bulan || 1);
    const sT = Number(start_tahun || 2026);
    const eB = Number(end_bulan || 12);
    const eT = Number(end_tahun || 2026);

    const startDay = '01';
    const lastDay = new Date(eT, eB, 0).getDate();
    const startDate = `${sT}-${String(sB).padStart(2, '0')}-${startDay}`;
    const endDate = `${eT}-${String(eB).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await db.query(
      `SELECT d.tanggal, d.jumlah, d.parameter_id, p.nama_parameter, p.kategori
       FROM lab_data_harian d
       JOIN lab_parameter p ON d.parameter_id = p.id
       WHERE d.tanggal BETWEEN ? AND ?
       ORDER BY d.tanggal ASC`,
      [startDate, endDate]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


/* ==================== 3.5. OUTPATIENT (RAWAT JALAN) ENDPOINTS ==================== */

// Get all outpatient visits with detailed actions
app.get('/api/pelayanan/rawat-jalan', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate ? String(endDate) : new Date().toISOString().split('T')[0];

  try {
    const regs = await db.query(`
      SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.unit, r.icd_kode, r.dpjp
      FROM registrasi_rawat_jalan r
      JOIN pasien p ON r.pasien_no_rm = p.no_rm
      WHERE r.tanggal_pelayanan BETWEEN ? AND ?
      ORDER BY r.tanggal_pelayanan DESC, r.id DESC
    `, [start, end]);
    
    const actions = await db.query(`
      SELECT t.registrasi_id, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, 
             t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal
      FROM tindakan_rawat_jalan t
      JOIN master_tindakan m ON t.tindakan_id = m.id
      WHERE t.tindakan_tanggal BETWEEN ? AND ?
    `, [start, end]);

    // Group tindakan by registrasi_id
    const groupedActions = (actions || []).reduce((acc: any, act: any) => {
      const rId = act.registrasi_id;
      if (!acc[rId]) acc[rId] = [];
      acc[rId].push({
        ...act,
        tindakan_nama: act.nama_tindakan,
        tarif_tindakan: Number(act.tarif_tindakan || 0),
        tarif_sarana: Number(act.tarif_sarana || 0),
        tarif_pelayanan: Number(act.tarif_pelayanan || 0),
        tarif_medis: Number(act.tarif_medis || 0),
        jumlah: Number(act.jumlah || 1),
        subtotal: Number(act.subtotal || 0)
      });
      return acc;
    }, {});

    // Attach tindakan to corresponding registration
    const formatted = (regs || []).map((r: any) => ({
      ...r,
      tindakan: groupedActions[r.id] || []
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

function cleanDateForDb(dateStr?: string): string | null {
  if (!dateStr) return null;
  let cleaned = String(dateStr).trim();
  if (!cleaned) return null;

  // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 1. Try parsing space-separated date, e.g., "05 Desember 2005" or "5 Des 2005" or "2005 Des 5"
  const spaceParts = cleaned.split(' ');
  if (spaceParts.length === 3) {
    let day = '';
    let month = '';
    let year = '';

    const monthsMap: { [key: string]: string } = {
      januari: '01', jan: '01',
      februari: '02', feb: '02',
      maret: '03', mar: '03',
      april: '04', apr: '04',
      mei: '05', may: '05',
      juni: '06', jun: '06',
      juli: '07', jul: '07',
      agustus: '08', agu: '08', ags: '08', aug: '08',
      september: '09', sep: '09',
      oktober: '10', okt: '10', oct: '10',
      november: '11', nov: '11',
      desember: '12', des: '12', dec: '12'
    };

    let foundMonthIndex = -1;
    let monthVal = '';
    for (let i = 0; i < 3; i++) {
      const partLower = spaceParts[i].toLowerCase();
      if (monthsMap[partLower]) {
        foundMonthIndex = i;
        monthVal = monthsMap[partLower];
        break;
      }
    }

    if (foundMonthIndex !== -1) {
      month = monthVal;
      const otherIndices = [0, 1, 2].filter(idx => idx !== foundMonthIndex);
      const p1 = spaceParts[otherIndices[0]];
      const p2 = spaceParts[otherIndices[1]];

      if (p1.length === 4) {
        year = p1;
        day = p2.padStart(2, '0');
      } else if (p2.length === 4) {
        year = p2;
        day = p1.padStart(2, '0');
      } else {
        if (Number(p1) > Number(p2)) {
          year = p1;
          day = p2.padStart(2, '0');
        } else {
          year = p2;
          day = p1.padStart(2, '0');
        }
      }

      if (year.length === 2) {
        year = Number(year) > 30 ? `19${year}` : `20${year}`;
      }
      if (year.length === 4 && !isNaN(Number(year)) && !isNaN(Number(day))) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // 2. Try parsing dash or slash separated, e.g. "05-12-2005" or "2005-12-05" or "12/05/2005"
  if (cleaned.includes('-') || cleaned.includes('/')) {
    const parts = cleaned.split(/[-/]/).map(p => p.trim());
    if (parts.length === 3) {
      const monthsMap: { [key: string]: string } = {
        januari: '01', jan: '01',
        februari: '02', feb: '02',
        maret: '03', mar: '03',
        april: '04', apr: '04',
        mei: '05', may: '05',
        juni: '06', jun: '06',
        juli: '07', jul: '07',
        agustus: '08', agu: '08', ags: '08', aug: '08',
        september: '09', sep: '09',
        oktober: '10', okt: '10', oct: '10',
        november: '11', nov: '11',
        desember: '12', des: '12', dec: '12'
      };
      
      let m = parts[1];
      const mLower = m.toLowerCase();
      if (monthsMap[mLower]) {
        m = monthsMap[mLower];
      } else {
        m = m.padStart(2, '0');
      }

      if (parts[2].length === 4) {
        const d = parts[0].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${m}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // 3. Fallback to native Date parser
  const parsedTimestamp = Date.parse(cleaned);
  if (!isNaN(parsedTimestamp)) {
    const dObj = new Date(parsedTimestamp);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const matchYmd = cleaned.match(/^(\d{4})[^\d]+(\d{1,2})[^\d]+(\d{1,2})$/);
  if (matchYmd) {
    return `${matchYmd[1]}-${matchYmd[2].padStart(2, '0')}-${matchYmd[3].padStart(2, '0')}`;
  }
  const matchDmy = cleaned.match(/^(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{4})$/);
  if (matchDmy) {
    return `${matchDmy[3]}-${matchDmy[2].padStart(2, '0')}-${matchDmy[1].padStart(2, '0')}`;
  }

  return null;
}

async function resolveWilayahIds(kotaNama?: string, kecamatanNama?: string, kelurahanNama?: string): Promise<{ kota_id: number | null; kecamatan_id: number | null; kelurahan_id: number | null }> {
  let kota_id: number | null = null;
  let kecamatan_id: number | null = null;
  let kelurahan_id: number | null = null;

  try {
    if (kotaNama && kotaNama.trim()) {
      const trimmedKota = kotaNama.trim();
      const existingKota: any = await db.query('SELECT id FROM kota WHERE LOWER(nama) = LOWER(?)', [trimmedKota]);
      if (existingKota && existingKota.length > 0) {
        kota_id = existingKota[0].id;
      } else {
        const insertRes = await db.query('INSERT INTO kota (nama) VALUES (?)', [trimmedKota]);
        kota_id = insertRes.insertId;
      }
    }

    if (kecamatanNama && kecamatanNama.trim() && kota_id) {
      const trimmedKec = kecamatanNama.trim();
      const existingKec: any = await db.query('SELECT id FROM kecamatan WHERE LOWER(nama) = LOWER(?) AND kota_id = ?', [trimmedKec, kota_id]);
      if (existingKec && existingKec.length > 0) {
        kecamatan_id = existingKec[0].id;
      } else {
        const insertRes = await db.query('INSERT INTO kecamatan (nama, kota_id) VALUES (?, ?)', [trimmedKec, kota_id]);
        kecamatan_id = insertRes.insertId;
      }
    }

    if (kelurahanNama && kelurahanNama.trim() && kecamatan_id) {
      const trimmedKel = kelurahanNama.trim();
      const existingKel: any = await db.query('SELECT id FROM kelurahan WHERE LOWER(nama) = LOWER(?) AND kecamatan_id = ?', [trimmedKel, kecamatan_id]);
      if (existingKel && existingKel.length > 0) {
        kelurahan_id = existingKel[0].id;
      } else {
        const insertRes = await db.query('INSERT INTO kelurahan (nama, kecamatan_id) VALUES (?, ?)', [trimmedKel, kecamatan_id]);
        kelurahan_id = insertRes.insertId;
      }
    }
  } catch (err) {
    console.error('Error in resolveWilayahIds:', err);
  }

  return { kota_id, kecamatan_id, kelurahan_id };
}

// Create new outpatient record with bulk tindakan actions
app.post('/api/pelayanan/rawat-jalan', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { 
    no_registrasi, no_rm, nama_pasien, tanggal_pelayanan, triase, unit, icd_kode, dpjp, tindakan,
    tanggal_lahir, jenis_kelamin, alamat, kelurahan, kecamatan, kota 
  } = req.body;
  
  if (!no_registrasi || !no_rm || !nama_pasien || !tanggal_pelayanan || !unit) {
    return res.status(400).json({ message: 'Data wajib diisi (termasuk unit pelayanan).' });
  }

  try {
    // Resolve Wilayah IDs
    const { kota_id, kecamatan_id, kelurahan_id } = await resolveWilayahIds(kota, kecamatan, kelurahan);

    // Clean gender and date of birth
    const jkClean = jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('P') ? 'P' : (jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('L') ? 'L' : null);
    const dobClean = cleanDateForDb(tanggal_lahir);

    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT * FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query(
        'INSERT INTO pasien (no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [no_rm, nama_pasien, dobClean, alamat || null, jkClean, kota_id, kecamatan_id, kelurahan_id]
      );
    } else {
      // Merge properties
      const p = existingPasien[0];
      const mergedNama = nama_pasien || p.nama;
      const mergedDob = dobClean || p.tanggal_lahir;
      const mergedAlamat = alamat || p.alamat;
      const mergedJk = jkClean || p.jenis_kelamin;
      const mergedKotaId = kota_id || p.kota_id;
      const mergedKecamatanId = kecamatan_id || p.kecamatan_id;
      const mergedKelurahanId = kelurahan_id || p.kelurahan_id;

      await db.query(
        'UPDATE pasien SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?, kota_id = ?, kecamatan_id = ?, kelurahan_id = ? WHERE no_rm = ?',
        [mergedNama, mergedDob, mergedAlamat, mergedJk, mergedKotaId, mergedKecamatanId, mergedKelurahanId, no_rm]
      );
    }
    
    // 2. Insert or Update Registrasi
    let regResult: any;
    const existingReg: any = await db.query('SELECT id FROM registrasi_rawat_jalan WHERE no_registrasi = ?', [no_registrasi]);
    
    if (existingReg && existingReg.length > 0) {
      const regId = existingReg[0].id;
      await db.query(
        'UPDATE registrasi_rawat_jalan SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, unit = ?, icd_kode = ?, dpjp = ? WHERE id = ?',
        [no_rm, tanggal_pelayanan, triase || 'hijau', unit || 'Poli Umum', icd_kode || null, dpjp || null, regId]
      );
      
      // Delete old tindakan records
      await db.query('DELETE FROM tindakan_rawat_jalan WHERE registrasi_id = ?', [regId]);
      
      regResult = { insertId: regId };
    } else {
      regResult = await db.query(
        'INSERT INTO registrasi_rawat_jalan (no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, unit, icd_kode, dpjp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [no_registrasi, no_rm, tanggal_pelayanan, triase || 'hijau', unit || 'Poli Umum', icd_kode || null, dpjp || null]
      );
    }
    const regId = regResult.insertId;

    // 3. Insert Tindakan
    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
            tid = existingTindakanList[0].id;
        } else {
            const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan) VALUES (?)', [t.tindakan_nama]);
            tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_rawat_jalan (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [regId, tid, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data berhasil didaftarkan.', regId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Master Data Tindakan
app.get('/api/master-tindakan', authenticateToken, async (req: any, res) => {
  try {
    const rows = await db.query('SELECT * FROM master_tindakan');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/debug/migrate', async (req: any, res) => {
  try {
    const result = await runMigrationScript({ cleanReset: false });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/master-tindakan', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { nama_tindakan, jenis } = req.body;
  try {
    await db.query('INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)', [nama_tindakan, jenis]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/master-tindakan/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { id } = req.params;
  const { nama_tindakan, jenis } = req.body;
  try {
    await db.query('UPDATE master_tindakan SET nama_tindakan = ?, jenis = ? WHERE id = ?', [nama_tindakan, jenis, Number(id)]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/master-tindakan/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM master_tindakan WHERE id = ?', [Number(id)]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Master Data Dokter
app.get('/api/dokter', authenticateToken, async (req: any, res) => {
  try {
    const rows = await db.query('SELECT * FROM dokter ORDER BY nama_dokter ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/dokter', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { nama_dokter, status } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO dokter (nama_dokter, status) VALUES (?, ?)',
      [nama_dokter, status || 'aktif']
    );
    res.json({ success: true, id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/dokter/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { id } = req.params;
  const { nama_dokter, status } = req.body;
  try {
    await db.query(
      'UPDATE dokter SET nama_dokter = ?, status = ? WHERE id = ?',
      [nama_dokter, status, Number(id)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/dokter/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM dokter WHERE id = ?', [Number(id)]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/dokter/bulk', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { doctors } = req.body;
  if (!Array.isArray(doctors)) return res.status(400).json({ message: 'Invalid data format' });
  
  try {
    for (const d of doctors) {
      if (d.nama_dokter) {
        await db.query(
          'INSERT INTO dokter (nama_dokter, status) VALUES (?, ?)',
          [d.nama_dokter, d.status || 'aktif']
        );
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Master Data Pasien
app.get('/api/pasien', authenticateToken, async (req: any, res) => {
  try {
    const rows = await db.query('SELECT p.*, k.nama as kota_nama, kec.nama as kecamatan_nama, kel.nama as kelurahan_nama FROM pasien p LEFT JOIN kota k ON p.kota_id = k.id LEFT JOIN kecamatan kec ON p.kecamatan_id = kec.id LEFT JOIN kelurahan kel ON p.kelurahan_id = kel.id');
    const formatted = rows.map((r: any) => ({
        no_rm: r.no_rm,
        nama: r.nama,
        tanggal_lahir: r.tanggal_lahir,
        alamat: r.alamat,
        jenis_kelamin: r.jenis_kelamin,
        kota: { id: r.kota_id, nama: r.kota_nama },
        kecamatan: { id: r.kecamatan_id, nama: r.kecamatan_nama },
        kelurahan: { id: r.kelurahan_id, nama: r.kelurahan_nama }
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/pasien', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id } = req.body;
  try {
    await db.query('INSERT INTO pasien (no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/pasien/:no_rm', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { no_rm } = req.params;
  const { nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id } = req.body;
  try {
    await db.query('UPDATE pasien SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?, kota_id = ?, kecamatan_id = ?, kelurahan_id = ? WHERE no_rm = ?', 
        [nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id, no_rm]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/pasien/:no_rm', authenticateToken, roleGuard(['admin']), async (req: any, res) => {
  const { no_rm } = req.params;
  try {
    await db.query('DELETE FROM pasien WHERE no_rm = ?', [no_rm]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- DEMOGRAFI & PASIEN LOYAL ENDPOINTS ---
app.get('/api/pelayanan/demografi/overview', authenticateToken, async (req: any, res: any) => {
  try {
    const isVirtual = db.getDiagnosticStatus().isVirtual;
    
    let startDateParam = req.query.startDate ? String(req.query.startDate) : null;
    let endDateParam = req.query.endDate ? String(req.query.endDate) : null;
    
    // Default to last 30 days if period is not specified
    if (!startDateParam || !endDateParam) {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDateParam = startDateParam || thirtyDaysAgo.toISOString().split('T')[0];
      endDateParam = endDateParam || today.toISOString().split('T')[0];
    }

    if (isVirtual) {
      const vdb = readVirtualDb();
      const patients = vdb.pasien || [];
      const rj = vdb.registrasi_rawat_jalan || [];
      const igd = vdb.registrasi_igd || [];
      const ranap = vdb.registrasi_ranap || [];
      const cities = vdb.kota || [];
      const districts = vdb.kecamatan || [];
      const subdistricts = vdb.kelurahan || [];

      // Union all visits
      const allVisits = [
        ...(rj || []).map((v: any) => ({ no_registrasi: v.no_registrasi, pasien_no_rm: v.pasien_no_rm, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'Rawat Jalan' })),
        ...(igd || []).map((v: any) => ({ no_registrasi: v.no_registrasi, pasien_no_rm: v.pasien_no_rm, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'IGD' })),
        ...(ranap || []).map((v: any) => ({ no_registrasi: v.no_registrasi, pasien_no_rm: v.pasien_no_rm, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'Rawat Inap' }))
      ];

      // Counters
      const visitCountMap: Record<string, number> = {};
      const visitCountPeriodMap: Record<string, number> = {};
      
      const sDate = new Date(startDateParam);
      const eDate = new Date(endDateParam);

      allVisits.forEach(v => {
        const rm = String(v.pasien_no_rm);
        visitCountMap[rm] = (visitCountMap[rm] || 0) + 1;
        
        const vDate = new Date(v.tanggal_pelayanan);
        if (vDate >= sDate && vDate <= eDate) {
          visitCountPeriodMap[rm] = (visitCountPeriodMap[rm] || 0) + 1;
        }
      });

      // Top All Time (20)
      const topAllTime = patients.map((p: any) => {
        const total_visits = visitCountMap[String(p.no_rm)] || 0;
        const city = cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui';
        const district = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
        const subdistrict = subdistricts.find((s: any) => s.id === p.kelurahan_id)?.nama || 'Tidak Diketahui';
        return {
          no_rm: p.no_rm,
          nama: p.nama,
          tanggal_lahir: p.tanggal_lahir,
          jenis_kelamin: p.jenis_kelamin || 'Tidak Diketahui',
          alamat: p.alamat || '-',
          kota: city,
          kecamatan: district,
          kelurahan: subdistrict,
          total_visits
        };
      }).filter(p => p.total_visits > 0)
        .sort((a, b) => b.total_visits - a.total_visits)
        .slice(0, 20);

      // Top Selected Period (20)
      const topPeriod = patients.map((p: any) => {
        const total_visits = visitCountPeriodMap[String(p.no_rm)] || 0;
        const city = cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui';
        const district = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
        const subdistrict = subdistricts.find((s: any) => s.id === p.kelurahan_id)?.nama || 'Tidak Diketahui';
        return {
          no_rm: p.no_rm,
          nama: p.nama,
          tanggal_lahir: p.tanggal_lahir,
          jenis_kelamin: p.jenis_kelamin || 'Tidak Diketahui',
          alamat: p.alamat || '-',
          kota: city,
          kecamatan: district,
          kelurahan: subdistrict,
          total_visits
        };
      }).filter(p => p.total_visits > 0)
        .sort((a, b) => b.total_visits - a.total_visits)
        .slice(0, 20);

      // Region Stats
      const kotaStats: Record<string, { kota: string; jumlah_pasien: number; jumlah_kunjungan: number }> = {};
      cities.forEach((c: any) => {
        kotaStats[c.nama] = { kota: c.nama, jumlah_pasien: 0, jumlah_kunjungan: 0 };
      });
      kotaStats['Tidak Diketahui'] = { kota: 'Tidak Diketahui', jumlah_pasien: 0, jumlah_kunjungan: 0 };

      patients.forEach((p: any) => {
        const cName = cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui';
        if (!kotaStats[cName]) kotaStats[cName] = { kota: cName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
        kotaStats[cName].jumlah_pasien += 1;
      });

      allVisits.forEach((v: any) => {
        const p = patients.find(pas => String(pas.no_rm) === String(v.pasien_no_rm));
        const cName = p ? (cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui') : 'Tidak Diketahui';
        if (!kotaStats[cName]) kotaStats[cName] = { kota: cName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
        kotaStats[cName].jumlah_kunjungan += 1;
      });
      const byKota = Object.values(kotaStats).sort((a, b) => b.jumlah_pasien - a.jumlah_pasien);

      // District
      const kecStats: Record<string, { kecamatan: string; kota: string; jumlah_pasien: number; jumlah_kunjungan: number }> = {};
      patients.forEach((p: any) => {
        const kName = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
        const cName = cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui';
        const key = `${kName} - ${cName}`;
        if (!kecStats[key]) kecStats[key] = { kecamatan: kName, kota: cName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
        kecStats[key].jumlah_pasien += 1;
      });
      allVisits.forEach((v: any) => {
        const p = patients.find(pas => String(pas.no_rm) === String(v.pasien_no_rm));
        if (p) {
          const kName = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
          const cName = cities.find((c: any) => c.id === p.kota_id)?.nama || 'Tidak Diketahui';
          const key = `${kName} - ${cName}`;
          if (!kecStats[key]) kecStats[key] = { kecamatan: kName, kota: cName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
          kecStats[key].jumlah_kunjungan += 1;
        }
      });
      const byKecamatan = Object.values(kecStats).sort((a, b) => b.jumlah_pasien - a.jumlah_pasien);

      // Subdistrict
      const kelStats: Record<string, { kelurahan: string; kecamatan: string; jumlah_pasien: number; jumlah_kunjungan: number }> = {};
      patients.forEach((p: any) => {
        const sName = subdistricts.find((s: any) => s.id === p.kelurahan_id)?.nama || 'Tidak Diketahui';
        const kName = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
        const key = `${sName} - ${kName}`;
        if (!kelStats[key]) kelStats[key] = { kelurahan: sName, kecamatan: kName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
        kelStats[key].jumlah_pasien += 1;
      });
      allVisits.forEach((v: any) => {
        const p = patients.find(pas => String(pas.no_rm) === String(v.pasien_no_rm));
        if (p) {
          const sName = subdistricts.find((s: any) => s.id === p.kelurahan_id)?.nama || 'Tidak Diketahui';
          const kName = districts.find((d: any) => d.id === p.kecamatan_id)?.nama || 'Tidak Diketahui';
          const key = `${sName} - ${kName}`;
          if (!kelStats[key]) kelStats[key] = { kelurahan: sName, kecamatan: kName, jumlah_pasien: 0, jumlah_kunjungan: 0 };
          kelStats[key].jumlah_kunjungan += 1;
        }
      });
      const byKelurahan = Object.values(kelStats).sort((a, b) => b.jumlah_pasien - a.jumlah_pasien);

      // Patient Demographics (Gender & Age)
      const genderStats = { L: 0, P: 0, 'Tidak Diketahui': 0 };
      patients.forEach((p: any) => {
        const jk = p.jenis_kelamin;
        if (jk === 'L') genderStats.L += 1;
        else if (jk === 'P') genderStats.P += 1;
        else genderStats['Tidak Diketahui'] += 1;
      });
      const byGender = [
        { jenis_kelamin: 'Laki-laki', jumlah: genderStats.L },
        { jenis_kelamin: 'Perempuan', jumlah: genderStats.P }
      ];
      if (genderStats['Tidak Diketahui'] > 0) {
        byGender.push({ jenis_kelamin: 'Tidak Diketahui', jumlah: genderStats['Tidak Diketahui'] });
      }

      // Age Group
      const ageStats = {
        'Balita (<5 thn)': 0,
        'Anak-anak (5-11 thn)': 0,
        'Remaja (12-17 thn)': 0,
        'Dewasa (18-45 thn)': 0,
        'Paruh Baya (46-60 thn)': 0,
        'Lansia (>60 thn)': 0,
        'Tidak Diketahui': 0
      };
      patients.forEach((p: any) => {
        if (!p.tanggal_lahir) {
          ageStats['Tidak Diketahui'] += 1;
          return;
        }
        const birthDate = new Date(p.tanggal_lahir);
        const diffMs = Date.now() - birthDate.getTime();
        const age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 5) ageStats['Balita (<5 thn)'] += 1;
        else if (age <= 11) ageStats['Anak-anak (5-11 thn)'] += 1;
        else if (age <= 17) ageStats['Remaja (12-17 thn)'] += 1;
        else if (age <= 45) ageStats['Dewasa (18-45 thn)'] += 1;
        else if (age <= 60) ageStats['Paruh Baya (46-60 thn)'] += 1;
        else ageStats['Lansia (>60 thn)'] += 1;
      });
      const byAgeGroup = Object.entries(ageStats)
        .map(([kelompok_usia, jumlah]) => ({ kelompok_usia, jumlah }))
        .filter(item => item.jumlah > 0);

      // Return unified response
      return res.json({
        topAllTime,
        topPeriod,
        byKota,
        byKecamatan,
        byKelurahan,
        byGender,
        byAgeGroup
      });
    } else {
      // Real VPS MySQL Queries
      const topAllTime = await db.query(`
        SELECT 
          p.no_rm,
          p.nama,
          p.tanggal_lahir,
          p.jenis_kelamin,
          p.alamat,
          IFNULL(k.nama, 'Tidak Diketahui') as kota,
          IFNULL(kec.nama, 'Tidak Diketahui') as kecamatan,
          IFNULL(kel.nama, 'Tidak Diketahui') as kelurahan,
          COUNT(DISTINCT r.no_registrasi) as total_visits
        FROM pasien p
        JOIN (
          SELECT no_registrasi, pasien_no_rm FROM registrasi_rawat_jalan
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_igd
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_ranap
        ) r ON p.no_rm = r.pasien_no_rm
        LEFT JOIN kota k ON p.kota_id = k.id
        LEFT JOIN kecamatan kec ON p.kecamatan_id = kec.id
        LEFT JOIN kelurahan kel ON p.kelurahan_id = kel.id
        GROUP BY p.no_rm
        ORDER BY total_visits DESC
        LIMIT 20
      `);

      const topPeriod = await db.query(`
        SELECT 
          p.no_rm,
          p.nama,
          p.tanggal_lahir,
          p.jenis_kelamin,
          p.alamat,
          IFNULL(k.nama, 'Tidak Diketahui') as kota,
          IFNULL(kec.nama, 'Tidak Diketahui') as kecamatan,
          IFNULL(kel.nama, 'Tidak Diketahui') as kelurahan,
          COUNT(DISTINCT r.no_registrasi) as total_visits
        FROM pasien p
        JOIN (
          SELECT no_registrasi, pasien_no_rm, tanggal_pelayanan FROM registrasi_rawat_jalan
          UNION ALL
          SELECT no_registrasi, pasien_no_rm, tanggal_pelayanan FROM registrasi_igd
          UNION ALL
          SELECT no_registrasi, pasien_no_rm, tanggal_pelayanan FROM registrasi_ranap
        ) r ON p.no_rm = r.pasien_no_rm
        LEFT JOIN kota k ON p.kota_id = k.id
        LEFT JOIN kecamatan kec ON p.kecamatan_id = kec.id
        LEFT JOIN kelurahan kel ON p.kelurahan_id = kel.id
        WHERE r.tanggal_pelayanan BETWEEN ? AND ?
        GROUP BY p.no_rm
        ORDER BY total_visits DESC
        LIMIT 20
      `, [startDateParam, endDateParam]);

      const byKota = await db.query(`
        SELECT 
          IFNULL(k.nama, 'Tidak Diketahui') as kota, 
          COUNT(DISTINCT p.no_rm) as jumlah_pasien,
          COUNT(DISTINCT r.no_registrasi) as jumlah_kunjungan
        FROM pasien p
        LEFT JOIN kota k ON p.kota_id = k.id
        LEFT JOIN (
          SELECT no_registrasi, pasien_no_rm FROM registrasi_rawat_jalan
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_igd
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_ranap
        ) r ON p.no_rm = r.pasien_no_rm
        GROUP BY k.nama
        ORDER BY jumlah_pasien DESC
      `);

      const byKecamatan = await db.query(`
        SELECT 
          IFNULL(kec.nama, 'Tidak Diketahui') as kecamatan, 
          IFNULL(k.nama, 'Tidak Diketahui') as kota,
          COUNT(DISTINCT p.no_rm) as jumlah_pasien,
          COUNT(DISTINCT r.no_registrasi) as jumlah_kunjungan
        FROM pasien p
        LEFT JOIN kota k ON p.kota_id = k.id
        LEFT JOIN kecamatan kec ON p.kecamatan_id = kec.id
        LEFT JOIN (
          SELECT no_registrasi, pasien_no_rm FROM registrasi_rawat_jalan
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_igd
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_ranap
        ) r ON p.no_rm = r.pasien_no_rm
        GROUP BY kec.nama, k.nama
        ORDER BY jumlah_pasien DESC
      `);

      const byKelurahan = await db.query(`
        SELECT 
          IFNULL(kel.nama, 'Tidak Diketahui') as kelurahan, 
          IFNULL(kec.nama, 'Tidak Diketahui') as kecamatan,
          COUNT(DISTINCT p.no_rm) as jumlah_pasien,
          COUNT(DISTINCT r.no_registrasi) as jumlah_kunjungan
        FROM pasien p
        LEFT JOIN kecamatan kec ON p.kecamatan_id = kec.id
        LEFT JOIN kelurahan kel ON p.kelurahan_id = kel.id
        LEFT JOIN (
          SELECT no_registrasi, pasien_no_rm FROM registrasi_rawat_jalan
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_igd
          UNION ALL
          SELECT no_registrasi, pasien_no_rm FROM registrasi_ranap
        ) r ON p.no_rm = r.pasien_no_rm
        GROUP BY kel.nama, kec.nama
        ORDER BY jumlah_pasien DESC
      `);

      const dbGender = await db.query(`
        SELECT 
          CASE jenis_kelamin
            WHEN 'L' THEN 'Laki-laki'
            WHEN 'P' THEN 'Perempuan'
            ELSE 'Tidak Diketahui'
          END as jenis_kelamin,
          COUNT(*) as jumlah
        FROM pasien
        GROUP BY jenis_kelamin
      `);

      const byGender = Array.isArray(dbGender) ? dbGender : [];

      const dbAgeGroup = await db.query(`
        SELECT 
          CASE 
            WHEN DATEDIFF(CURRENT_DATE, tanggal_lahir) / 365.25 < 5 THEN 'Balita (<5 thn)'
            WHEN DATEDIFF(CURRENT_DATE, tanggal_lahir) / 365.25 BETWEEN 5 AND 11 THEN 'Anak-anak (5-11 thn)'
            WHEN DATEDIFF(CURRENT_DATE, tanggal_lahir) / 365.25 BETWEEN 12 AND 17 THEN 'Remaja (12-17 thn)'
            WHEN DATEDIFF(CURRENT_DATE, tanggal_lahir) / 365.25 BETWEEN 18 AND 45 THEN 'Dewasa (18-45 thn)'
            WHEN DATEDIFF(CURRENT_DATE, tanggal_lahir) / 365.25 BETWEEN 46 AND 60 THEN 'Paruh Baya (46-60 thn)'
            ELSE 'Lansia (>60 thn)'
          END as kelompok_usia,
          COUNT(*) as jumlah
        FROM pasien
        WHERE tanggal_lahir IS NOT NULL
        GROUP BY kelompok_usia
      `);
      const byAgeGroup = Array.isArray(dbAgeGroup) ? dbAgeGroup : [];

      return res.json({
        topAllTime,
        topPeriod,
        byKota,
        byKecamatan,
        byKelurahan,
        byGender,
        byAgeGroup
      });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/pelayanan/demografi/loyal-pasien/:no_rm', authenticateToken, async (req: any, res: any) => {
  try {
    const { no_rm } = req.params;
    const isVirtual = db.getDiagnosticStatus().isVirtual;

    if (isVirtual) {
      const vdb = readVirtualDb();
      const rj = (vdb.registrasi_rawat_jalan || []).filter((v: any) => String(v.pasien_no_rm) === String(no_rm));
      const igd = (vdb.registrasi_igd || []).filter((v: any) => String(v.pasien_no_rm) === String(no_rm));
      const ranap = (vdb.registrasi_ranap || []).filter((v: any) => String(v.pasien_no_rm) === String(no_rm));

      const history = [
        ...rj.map((v: any) => ({ no_registrasi: v.no_registrasi, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'Rawat Jalan', dpjp: v.dpjp || 'dr. Umum', icd: v.icd_kode || '-' })),
        ...igd.map((v: any) => ({ no_registrasi: v.no_registrasi, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'IGD', dpjp: v.dpjp || 'dr. IGD', icd: v.icd_kode || '-' })),
        ...ranap.map((v: any) => ({ no_registrasi: v.no_registrasi, tanggal_pelayanan: v.tanggal_pelayanan, tipe: 'Rawat Inap', dpjp: v.dpjp || 'dr. Spesialis', icd: v.icd_masuk || v.icd_pulang || '-' }))
      ].sort((a, b) => new Date(b.tanggal_pelayanan).getTime() - new Date(a.tanggal_pelayanan).getTime());

      res.json(history);
    } else {
      const history = await db.query(`
        SELECT no_registrasi, tanggal_pelayanan, 'Rawat Jalan' as tipe, IFNULL(dpjp, 'dr. Umum') as dpjp, IFNULL(icd_kode, '-') as icd FROM registrasi_rawat_jalan WHERE pasien_no_rm = ?
        UNION ALL
        SELECT no_registrasi, tanggal_pelayanan, 'IGD' as tipe, IFNULL(dpjp, 'dr. IGD') as dpjp, IFNULL(icd_kode, '-') as icd FROM registrasi_igd WHERE pasien_no_rm = ?
        UNION ALL
        SELECT no_registrasi, tanggal_pelayanan, 'Rawat Inap' as tipe, IFNULL(dpjp, 'dr. Spesialis') as dpjp, CONCAT_WS(' / ', IFNULL(icd_masuk, '-'), IFNULL(icd_pulang, '-')) as icd FROM registrasi_ranap WHERE pasien_no_rm = ?
        ORDER BY tanggal_pelayanan DESC
      `, [no_rm, no_rm, no_rm]);
      res.json(history);
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/pelayanan/demografi/diagnosa', authenticateToken, async (req: any, res: any) => {
  try {
    const isVirtual = db.getDiagnosticStatus().isVirtual;
    
    let startDateParam = req.query.startDate ? String(req.query.startDate) : null;
    let endDateParam = req.query.endDate ? String(req.query.endDate) : null;
    
    if (!startDateParam || !endDateParam) {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDateParam = startDateParam || thirtyDaysAgo.toISOString().split('T')[0];
      endDateParam = endDateParam || today.toISOString().split('T')[0];
    }

    let rj: any[] = [];
    let igd: any[] = [];
    let ranap: any[] = [];
    let patients: any[] = [];
    let icdMaster: any[] = [];

    if (isVirtual) {
      const vdb = readVirtualDb();
      rj = vdb.registrasi_rawat_jalan || [];
      igd = vdb.registrasi_igd || [];
      ranap = vdb.registrasi_ranap || [];
      patients = vdb.pasien || [];
      icdMaster = vdb.master_icd10 || [];
    } else {
      rj = await db.query(`SELECT id, no_registrasi, pasien_no_rm, tanggal_pelayanan, icd_kode, dpjp FROM registrasi_rawat_jalan`);
      igd = await db.query(`SELECT id, no_registrasi, pasien_no_rm, tanggal_pelayanan, icd_kode, dpjp FROM registrasi_igd`);
      ranap = await db.query(`SELECT id, no_registrasi, pasien_no_rm, tanggal_pelayanan, icd_masuk, icd_pulang, dpjp FROM registrasi_ranap`);
      patients = await db.query(`SELECT no_rm, nama, tanggal_lahir, jenis_kelamin FROM pasien`);
      icdMaster = await db.query(`SELECT id, kode_icd, deskripsi FROM master_icd10`);
    }

    // Standardize collections
    const rjVisits = rj.map((v: any) => ({
      no_registrasi: v.no_registrasi,
      pasien_no_rm: v.pasien_no_rm,
      tanggal_pelayanan: v.tanggal_pelayanan,
      icd_kode: v.icd_kode,
      tipe: 'Rawat Jalan'
    }));

    const igdVisits = igd.map((v: any) => ({
      no_registrasi: v.no_registrasi,
      pasien_no_rm: v.pasien_no_rm,
      tanggal_pelayanan: v.tanggal_pelayanan,
      icd_kode: v.icd_kode,
      tipe: 'IGD'
    }));

    const ranapVisits = ranap.map((v: any) => {
      const icd = v.icd_pulang || v.icd_masuk || '';
      return {
        no_registrasi: v.no_registrasi,
        pasien_no_rm: v.pasien_no_rm,
        tanggal_pelayanan: v.tanggal_pelayanan,
        icd_kode: icd,
        tipe: 'Rawat Inap'
      };
    });

    const allVisits = [...rjVisits, ...igdVisits, ...ranapVisits];

    const sDate = new Date(startDateParam);
    const eDate = new Date(endDateParam);

    // Filter within period
    const filteredVisits = allVisits.filter(v => {
      if (!v.icd_kode) return false;
      const code = String(v.icd_kode).trim().toUpperCase();
      if (!code || code === '-' || code === 'TIDAK ADA' || code === 'NULL') return false;
      
      const vDate = new Date(v.tanggal_pelayanan);
      return vDate >= sDate && vDate <= eDate;
    });

    // Let's create an ICD Map for description lookup
    const icdMap: Record<string, string> = {};
    icdMaster.forEach((item: any) => {
      const code = String(item.kode_icd || item.code || '').trim().toUpperCase();
      if (code) {
        icdMap[code] = item.deskripsi || item.description || 'Diagnosis Umum';
      }
    });

    // Create a Patient map for gender / age lookup
    const patientMap: Record<string, any> = {};
    patients.forEach((p: any) => {
      patientMap[String(p.no_rm)] = p;
    });

    // Grouping stats
    const diagnosaStats: Record<string, {
      icd_kode: string;
      deskripsi: string;
      jumlah: number;
      rawat_jalan: number;
      igd: number;
      rawat_inap: number;
      gender: { L: number; P: number; 'Tidak Diketahui': number };
      age: {
        'Balita (<5 thn)': number;
        'Anak-anak (5-11 thn)': number;
        'Remaja (12-17 thn)': number;
        'Dewasa (18-45 thn)': number;
        'Paruh Baya (46-60 thn)': number;
        'Lansia (>60 thn)': number;
        'Tidak Diketahui': number;
      };
    }> = {};

    filteredVisits.forEach((v: any) => {
      const code = String(v.icd_kode).trim().toUpperCase();
      const desc = icdMap[code] || 'Diagnosis Lain-lain';
      
      if (!diagnosaStats[code]) {
        diagnosaStats[code] = {
          icd_kode: code,
          deskripsi: desc,
          jumlah: 0,
          rawat_jalan: 0,
          igd: 0,
          rawat_inap: 0,
          gender: { L: 0, P: 0, 'Tidak Diketahui': 0 },
          age: {
            'Balita (<5 thn)': 0,
            'Anak-anak (5-11 thn)': 0,
            'Remaja (12-17 thn)': 0,
            'Dewasa (18-45 thn)': 0,
            'Paruh Baya (46-60 thn)': 0,
            'Lansia (>60 thn)': 0,
            'Tidak Diketahui': 0
          }
        };
      }

      const stat = diagnosaStats[code];
      stat.jumlah += 1;
      
      if (v.tipe === 'Rawat Jalan') stat.rawat_jalan += 1;
      else if (v.tipe === 'IGD') stat.igd += 1;
      else if (v.tipe === 'Rawat Inap') stat.rawat_inap += 1;

      // Gender & Age calculations
      const patient = patientMap[String(v.pasien_no_rm)];
      if (patient) {
        const jk = patient.jenis_kelamin;
        if (jk === 'L') stat.gender.L += 1;
        else if (jk === 'P') stat.gender.P += 1;
        else stat.gender['Tidak Diketahui'] += 1;

        if (!patient.tanggal_lahir) {
          stat.age['Tidak Diketahui'] += 1;
        } else {
          const birthDate = new Date(patient.tanggal_lahir);
          const diffMs = Date.now() - birthDate.getTime();
          const age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
          if (age < 5) stat.age['Balita (<5 thn)'] += 1;
          else if (age <= 11) stat.age['Anak-anak (5-11 thn)'] += 1;
          else if (age <= 17) stat.age['Remaja (12-17 thn)'] += 1;
          else if (age <= 45) stat.age['Dewasa (18-45 thn)'] += 1;
          else if (age <= 60) stat.age['Paruh Baya (46-60 thn)'] += 1;
          else stat.age['Lansia (>60 thn)'] += 1;
        }
      } else {
        stat.gender['Tidak Diketahui'] += 1;
        stat.age['Tidak Diketahui'] += 1;
      }
    });

    const sortedDiagnosa = Object.values(diagnosaStats)
      .sort((a, b) => b.jumlah - a.jumlah);

    const topDiagnosa = sortedDiagnosa.slice(0, 15);

    // Timeline trend calculation
    const timelineMap: Record<string, Record<string, number>> = {};
    const top5Codes = topDiagnosa.slice(0, 5).map(d => d.icd_kode);

    filteredVisits.forEach((v: any) => {
      const code = String(v.icd_kode).trim().toUpperCase();
      if (!top5Codes.includes(code)) return;

      const dateStr = String(v.tanggal_pelayanan).split('T')[0];
      if (!timelineMap[dateStr]) {
        timelineMap[dateStr] = {};
        top5Codes.forEach(c => { timelineMap[dateStr][c] = 0; });
      }
      timelineMap[dateStr][code] += 1;
    });

    const timelineData = Object.entries(timelineMap)
      .map(([tanggal, counts]) => ({
        tanggal,
        ...counts
      }))
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    res.json({
      topDiagnosa,
      timelineData,
      top5Codes
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Master Wilayah
app.get('/api/kota', authenticateToken, async (req: any, res) => { try { const rows = await db.query('SELECT * FROM kota'); res.json(rows); } catch (err: any) { res.status(500).json({ message: err.message }); } });
app.post('/api/kota', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { const { nama } = req.body; if (!nama) throw new Error('Nama kota wajib diisi'); await db.query('INSERT INTO kota (nama) VALUES (?)', [nama]); res.json({ success: true }); } catch (err: any) { res.status(400).json({ message: err.message }); } });
app.delete('/api/kota/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { await db.query('DELETE FROM kota WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); } });

app.get('/api/kecamatan', authenticateToken, async (req: any, res) => { try { const rows = await db.query('SELECT kec.*, k.nama as kota_nama FROM kecamatan kec LEFT JOIN kota k ON kec.kota_id = k.id'); res.json(rows); } catch (err: any) { res.status(500).json({ message: err.message }); } });
app.post('/api/kecamatan', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { const { nama, kota_id } = req.body; if (!nama || !kota_id) throw new Error('Nama kecamatan dan kota ID wajib diisi'); await db.query('INSERT INTO kecamatan (nama, kota_id) VALUES (?, ?)', [nama, kota_id]); res.json({ success: true }); } catch (err: any) { res.status(400).json({ message: err.message }); } });
app.delete('/api/kecamatan/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { await db.query('DELETE FROM kecamatan WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); } });

app.get('/api/kelurahan', authenticateToken, async (req: any, res) => { try { const rows = await db.query('SELECT kel.*, kec.nama as kecamatan_nama FROM kelurahan kel LEFT JOIN kecamatan kec ON kel.kecamatan_id = kec.id'); res.json(rows); } catch (err: any) { res.status(500).json({ message: err.message }); } });
app.post('/api/kelurahan', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { const { nama, kecamatan_id } = req.body; if (!nama || !kecamatan_id) throw new Error('Nama kelurahan dan kecamatan ID wajib diisi'); await db.query('INSERT INTO kelurahan (nama, kecamatan_id) VALUES (?, ?)', [nama, kecamatan_id]); res.json({ success: true }); } catch (err: any) { res.status(400).json({ message: err.message }); } });
app.delete('/api/kelurahan/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => { try { await db.query('DELETE FROM kelurahan WHERE id = ?', [req.params.id]); res.json({ success: true }); } catch (err: any) { res.status(500).json({ message: err.message }); } });

// Update outpatient patient details & actions
app.put('/api/pelayanan/rawat-jalan/:id', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  const { no_rm, nama_pasien, tanggal_pelayanan, triase, unit, icd_kode, dpjp, tindakan } = req.body;

  if (!no_rm || !nama_pasien || !tanggal_pelayanan || !unit) {
    return res.status(400).json({ message: 'Data wajib diisi (termasuk unit pelayanan).' });
  }

  try {
    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT no_rm FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query('INSERT INTO pasien (no_rm, nama) VALUES (?, ?)', [no_rm, nama_pasien]);
    }
    
    // 2. Update Registrasi
    await db.query(
      'UPDATE registrasi_rawat_jalan SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, unit = ?, icd_kode = ?, dpjp = ? WHERE id = ?',
      [no_rm, tanggal_pelayanan, triase || 'hijau', unit || 'Poli Umum', icd_kode || null, dpjp || null, Number(id)]
    );

    // 3. Re-create child tindakan records to ensure clean relational master-detail status
    await db.query('DELETE FROM tindakan_rawat_jalan WHERE registrasi_id = ?', [Number(id)]);

    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
            tid = existingTindakanList[0].id;
        } else {
            const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan) VALUES (?)', [t.tindakan_nama]);
            tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_rawat_jalan (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Number(id), tid, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data kunjungan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Delete outpatient visit
app.delete('/api/pelayanan/rawat-jalan/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { id } = req.params;
  try {
    // Both real MySQL (via foreign key rule count) and Virtual DB will delete related tindakan elements
    await db.query('DELETE FROM registrasi_rawat_jalan WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Data kunjungan berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// --- IGD MODUL ENDPOINTS ---
// ==========================================

// Get all IGD visits with detailed actions
app.get('/api/pelayanan/igd', authenticateToken, async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate ? String(endDate) : new Date().toISOString().split('T')[0];

  try {
    const regs = await db.query(`
      SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.icd_kode, r.dpjp
      FROM registrasi_igd r
      JOIN pasien p ON r.pasien_no_rm = p.no_rm
      WHERE r.tanggal_pelayanan BETWEEN ? AND ?
      ORDER BY r.tanggal_pelayanan DESC, r.id DESC
    `, [start, end]);
    
    const actions = await db.query(`
      SELECT t.registrasi_id, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, 
             t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal
      FROM tindakan_igd t
      JOIN master_tindakan m ON t.tindakan_id = m.id
      WHERE t.tindakan_tanggal BETWEEN ? AND ?
    `, [start, end]);

    // Group tindakan by registrasi_id
    const groupedActions = (actions || []).reduce((acc: any, act: any) => {
      const rId = act.registrasi_id;
      if (!acc[rId]) acc[rId] = [];
      acc[rId].push({
        ...act,
        tindakan_nama: act.nama_tindakan,
        tarif_tindakan: Number(act.tarif_tindakan || 0),
        tarif_sarana: Number(act.tarif_sarana || 0),
        tarif_pelayanan: Number(act.tarif_pelayanan || 0),
        tarif_medis: Number(act.tarif_medis || 0),
        jumlah: Number(act.jumlah || 1),
        subtotal: Number(act.subtotal || 0)
      });
      return acc;
    }, {});

    // Attach tindakan to corresponding registration
    const formatted = (regs || []).map((r: any) => ({
      ...r,
      tindakan: groupedActions[r.id] || []
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Create new IGD record with bulk tindakan actions
app.post('/api/pelayanan/igd', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { 
    no_registrasi, no_rm, nama_pasien, tanggal_pelayanan, triase, icd_kode, dpjp, tindakan,
    tanggal_lahir, jenis_kelamin, alamat, kelurahan, kecamatan, kota 
  } = req.body;
  
  if (!no_registrasi || !no_rm || !nama_pasien || !tanggal_pelayanan) {
    return res.status(400).json({ message: 'Data wajib diisi.' });
  }

  try {
    // Resolve Wilayah IDs
    const { kota_id, kecamatan_id, kelurahan_id } = await resolveWilayahIds(kota, kecamatan, kelurahan);

    // Clean gender and date of birth
    const jkClean = jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('P') ? 'P' : (jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('L') ? 'L' : null);
    const dobClean = cleanDateForDb(tanggal_lahir);

    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT * FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query(
        'INSERT INTO pasien (no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [no_rm, nama_pasien, dobClean, alamat || null, jkClean, kota_id, kecamatan_id, kelurahan_id]
      );
    } else {
      // Merge properties
      const p = existingPasien[0];
      const mergedNama = nama_pasien || p.nama;
      const mergedDob = dobClean || p.tanggal_lahir;
      const mergedAlamat = alamat || p.alamat;
      const mergedJk = jkClean || p.jenis_kelamin;
      const mergedKotaId = kota_id || p.kota_id;
      const mergedKecamatanId = kecamatan_id || p.kecamatan_id;
      const mergedKelurahanId = kelurahan_id || p.kelurahan_id;

      await db.query(
        'UPDATE pasien SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?, kota_id = ?, kecamatan_id = ?, kelurahan_id = ? WHERE no_rm = ?',
        [mergedNama, mergedDob, mergedAlamat, mergedJk, mergedKotaId, mergedKecamatanId, mergedKelurahanId, no_rm]
      );
    }
    
    // 2. Insert or Update Registrasi
    let regResult: any;
    const existingReg: any = await db.query('SELECT id FROM registrasi_igd WHERE no_registrasi = ?', [no_registrasi]);
    
    if (existingReg && existingReg.length > 0) {
      const regId = existingReg[0].id;
      await db.query(
        'UPDATE registrasi_igd SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, icd_kode = ?, dpjp = ? WHERE id = ?',
        [no_rm, tanggal_pelayanan, triase || 'hijau', icd_kode || null, dpjp || null, regId]
      );
      
      // Delete old tindakan records
      await db.query('DELETE FROM tindakan_igd WHERE registrasi_id = ?', [regId]);
      
      regResult = { insertId: regId };
    } else {
      regResult = await db.query(
        'INSERT INTO registrasi_igd (no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, icd_kode, dpjp) VALUES (?, ?, ?, ?, ?, ?)',
        [no_registrasi, no_rm, tanggal_pelayanan, triase || 'hijau', icd_kode || null, dpjp || null]
      );
    }
    const regId = regResult.insertId;

    // 3. Insert Tindakan
    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
          tid = existingTindakanList[0].id;
        } else {
          const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)', [t.tindakan_nama, 'ralan']);
          tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_igd (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [regId, tid, t.tindakan_keterangan || '', t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data berhasil didaftarkan.', regId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Update IGD patient details & actions
app.put('/api/pelayanan/igd/:id', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  const { no_rm, nama_pasien, tanggal_pelayanan, triase, icd_kode, dpjp, tindakan } = req.body;

  if (!no_rm || !nama_pasien || !tanggal_pelayanan) {
    return res.status(400).json({ message: 'Data wajib diisi.' });
  }

  try {
    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT no_rm FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query('INSERT INTO pasien (no_rm, nama) VALUES (?, ?)', [no_rm, nama_pasien]);
    }
    
    // 2. Update Registrasi
    await db.query(
      'UPDATE registrasi_igd SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, icd_kode = ?, dpjp = ? WHERE id = ?',
      [no_rm, tanggal_pelayanan, triase || 'hijau', icd_kode || null, dpjp || null, Number(id)]
    );

    // 3. Re-create child tindakan records to ensure clean relational master-detail status
    await db.query('DELETE FROM tindakan_igd WHERE registrasi_id = ?', [Number(id)]);

    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
            tid = existingTindakanList[0].id;
        } else {
            const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)', [t.tindakan_nama, 'ralan']);
            tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_igd (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Number(id), tid, t.tindakan_keterangan || '', t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data kunjungan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Delete IGD visit
app.delete('/api/pelayanan/igd/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM registrasi_igd WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Data kunjungan berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- Rawat Inap (Ranap) Endpoints ---
app.get('/api/pelayanan/ranap', authenticateToken, async (req: any, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? String(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate ? String(endDate) : new Date().toISOString().split('T')[0];

  try {
    const registrations = await db.query(
      'SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.icd_masuk, r.icd_pulang, r.kamar, r.dpjp FROM registrasi_ranap r JOIN pasien p ON r.pasien_no_rm = p.no_rm WHERE r.tanggal_pelayanan BETWEEN ? AND ? ORDER BY r.tanggal_pelayanan DESC, r.id DESC',
      [start, end]
    );

    const actions = await db.query(
      'SELECT t.registrasi_id, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal FROM tindakan_ranap t JOIN master_tindakan m ON t.tindakan_id = m.id'
    );

    // Group actions by registrasi_id
    const actionsGrouped = actions.reduce((acc: any, act: any) => {
      if (!acc[act.registrasi_id]) acc[act.registrasi_id] = [];
      acc[act.registrasi_id].push({
        tindakan_nama: act.nama_tindakan,
        tindakan_keterangan: act.tindakan_keterangan || '',
        tindakan_tanggal: act.tindakan_tanggal ? (typeof act.tindakan_tanggal === 'string' ? act.tindakan_tanggal.split('T')[0] : act.tindakan_tanggal) : '',
        tindakan_jam: act.tindakan_jam,
        tarif_tindakan: Number(act.tarif_tindakan || 0),
        tarif_sarana: Number(act.tarif_sarana || 0),
        tarif_pelayanan: Number(act.tarif_pelayanan || 0),
        tarif_medis: Number(act.tarif_medis || 0),
        jumlah: Number(act.jumlah || 1),
        subtotal: Number(act.subtotal || 0)
      });
      return acc;
    }, {});

    const formatted = registrations.map((r: any) => ({
      id: r.id,
      no_registrasi: r.no_registrasi,
      no_rm: r.no_rm,
      nama_pasien: r.nama_pasien,
      tanggal_pelayanan: r.tanggal_pelayanan ? (typeof r.tanggal_pelayanan === 'string' ? r.tanggal_pelayanan.split('T')[0] : r.tanggal_pelayanan) : '',
      triase: r.triase || 'hijau',
      icd_masuk: r.icd_masuk || '',
      icd_pulang: r.icd_pulang || '',
      kamar: r.kamar || '',
      tindakan: actionsGrouped[r.id] || []
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/pelayanan/ranap', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { 
    no_registrasi, no_rm, nama_pasien, tanggal_pelayanan, triase, icd_masuk, icd_pulang, kamar, dpjp, tindakan,
    tanggal_lahir, jenis_kelamin, alamat, kelurahan, kecamatan, kota 
  } = req.body;
  
  if (!no_registrasi || !no_rm || !nama_pasien || !tanggal_pelayanan) {
    return res.status(400).json({ message: 'Data wajib diisi.' });
  }

  try {
    // Resolve Wilayah IDs
    const { kota_id, kecamatan_id, kelurahan_id } = await resolveWilayahIds(kota, kecamatan, kelurahan);

    // Clean gender and date of birth
    const jkClean = jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('P') ? 'P' : (jenis_kelamin && String(jenis_kelamin).trim().toUpperCase().startsWith('L') ? 'L' : null);
    const dobClean = cleanDateForDb(tanggal_lahir);

    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT * FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query(
        'INSERT INTO pasien (no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        [no_rm, nama_pasien, dobClean, alamat || null, jkClean, kota_id, kecamatan_id, kelurahan_id]
      );
    } else {
      // Merge properties
      const p = existingPasien[0];
      const mergedNama = nama_pasien || p.nama;
      const mergedDob = dobClean || p.tanggal_lahir;
      const mergedAlamat = alamat || p.alamat;
      const mergedJk = jkClean || p.jenis_kelamin;
      const mergedKotaId = kota_id || p.kota_id;
      const mergedKecamatanId = kecamatan_id || p.kecamatan_id;
      const mergedKelurahanId = kelurahan_id || p.kelurahan_id;

      await db.query(
        'UPDATE pasien SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?, kota_id = ?, kecamatan_id = ?, kelurahan_id = ? WHERE no_rm = ?',
        [mergedNama, mergedDob, mergedAlamat, mergedJk, mergedKotaId, mergedKecamatanId, mergedKelurahanId, no_rm]
      );
    }
    
    // 2. Insert or Update Registrasi
    let regResult: any;
    const existingReg: any = await db.query('SELECT id FROM registrasi_ranap WHERE no_registrasi = ?', [no_registrasi]);
    
    if (existingReg && existingReg.length > 0) {
      const regId = existingReg[0].id;
      await db.query(
        'UPDATE registrasi_ranap SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, icd_masuk = ?, icd_pulang = ?, kamar = ?, dpjp = ? WHERE id = ?',
        [no_rm, tanggal_pelayanan, triase || 'hijau', icd_masuk || null, icd_pulang || null, kamar || '', dpjp || null, regId]
      );
      
      // Delete old tindakan records
      await db.query('DELETE FROM tindakan_ranap WHERE registrasi_id = ?', [regId]);
      
      regResult = { insertId: regId };
    } else {
      regResult = await db.query(
        'INSERT INTO registrasi_ranap (no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, icd_masuk, icd_pulang, kamar, dpjp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [no_registrasi, no_rm, tanggal_pelayanan, triase || 'hijau', icd_masuk || null, icd_pulang || null, kamar || '', dpjp || null]
      );
    }
    const regId = regResult.insertId;

    // 3. Insert Tindakan
    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
          tid = existingTindakanList[0].id;
        } else {
          const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)', [t.tindakan_nama, 'ranap']);
          tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_ranap (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [regId, tid, t.tindakan_keterangan || '', t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data rawat inap berhasil didaftarkan.', regId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/pelayanan/ranap/:id', authenticateToken, roleGuard(['admin', 'perawat', 'analis']), async (req: any, res) => {
  const { id } = req.params;
  const { no_rm, nama_pasien, tanggal_pelayanan, triase, icd_masuk, icd_pulang, kamar, dpjp, tindakan } = req.body;

  if (!no_rm || !nama_pasien || !tanggal_pelayanan) {
    return res.status(400).json({ message: 'Data wajib diisi.' });
  }

  try {
    // 1. Cek pasien dengan no_rm yang sama
    const existingPasien: any = await db.query('SELECT no_rm FROM pasien WHERE no_rm = ?', [no_rm]);
    if (!existingPasien || existingPasien.length === 0) {
      await db.query('INSERT INTO pasien (no_rm, nama) VALUES (?, ?)', [no_rm, nama_pasien]);
    }
    
    // 2. Update Registrasi
    await db.query(
      'UPDATE registrasi_ranap SET pasien_no_rm = ?, tanggal_pelayanan = ?, triase = ?, icd_masuk = ?, icd_pulang = ?, kamar = ?, dpjp = ? WHERE id = ?',
      [no_rm, tanggal_pelayanan, triase || 'hijau', icd_masuk || null, icd_pulang || null, kamar || '', dpjp || null, Number(id)]
    );

    // 3. Re-create actions
    await db.query('DELETE FROM tindakan_ranap WHERE registrasi_id = ?', [Number(id)]);

    if (Array.isArray(tindakan) && tindakan.length > 0) {
      for (const t of tindakan) {
        // Upsert Master Tindakan
        const existingTindakanList: any = await db.query('SELECT id FROM master_tindakan WHERE nama_tindakan = ?', [t.tindakan_nama]);
        let tid;
        if (existingTindakanList && existingTindakanList.length > 0) {
          tid = existingTindakanList[0].id;
        } else {
          const tResult = await db.query('INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)', [t.tindakan_nama, 'ranap']);
          tid = tResult.insertId;
        }

        await db.query(
          'INSERT INTO tindakan_ranap (registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam, tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Number(id), tid, t.tindakan_keterangan || '', t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal]
        );
      }
    }

    res.json({ success: true, message: 'Data kunjungan berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/pelayanan/ranap/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req: any, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM registrasi_ranap WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Data kunjungan berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// --- ICD-10 Master Data ---
app.get('/api/pelayanan/icd10', authenticateToken, async (req, res) => {
  try {
    const data = await db.query('SELECT * FROM master_icd10');
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/pelayanan/icd10', authenticateToken, roleGuard(['admin', 'perawat']), async (req, res) => {
  const { kode_icd, deskripsi } = req.body;
  if (!kode_icd || !deskripsi) return res.status(400).json({ message: 'Kode dan Deskripsi wajib diisi.' });
  try {
    await db.query('INSERT INTO master_icd10 (kode_icd, deskripsi) VALUES (?, ?)', [kode_icd, deskripsi]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/pelayanan/icd10/:id', authenticateToken, roleGuard(['admin', 'perawat']), async (req, res) => {
  const { kode_icd, deskripsi } = req.body;
  const { id } = req.params;
  try {
    await db.query('UPDATE master_icd10 SET kode_icd = ?, deskripsi = ? WHERE id = ?', [kode_icd, deskripsi, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


/* ==================== 4. PHARMACY ENDPOINTS ==================== */

async function fetchMedicinesWithStock(q?: string) {
  const medicines = await db.query('SELECT * FROM obat_master WHERE is_active = 1');
  
  // Try retrieving harian logs, handle missing table safely
  let harian: any[] = [];
  try {
    harian = await db.query('SELECT * FROM obat_konsumsi_harian') || [];
  } catch (err) {
    console.warn('Error reading harian logs:', err);
  }

  const results = medicines.map((m: any) => {
    const saldo_tahun = m.saldo_awal_tahun ? Number(m.saldo_awal_tahun) : null;
    const saldo_bulan = m.saldo_awal_bulan ? Number(m.saldo_awal_bulan) : null;
    const saldo_nilai = Number(m.saldo_awal_nilai || 0);

    let total_penerimaan = 0;
    let total_pemakaian = 0;
    let total_retur_hilang = 0;

    if (saldo_tahun && saldo_bulan) {
      const startingDateStr = `${saldo_tahun}-${String(saldo_bulan).padStart(2, '0')}-01`;
      
      const relevantLogs = harian.filter((h: any) => {
        return h.obat_id === m.id && h.tanggal >= startingDateStr;
      });

      relevantLogs.forEach((h: any) => {
        total_penerimaan += Number(h.penerimaan || 0);
        total_pemakaian += Number(h.pemakaian || 0);
        total_retur_hilang += Number(h.retur_hilang || 0);
      });
    }

    const stok_akhir = (saldo_tahun && saldo_bulan)
      ? (saldo_nilai + total_penerimaan - total_pemakaian - total_retur_hilang)
      : 0;

    return {
      ...m,
      saldo_awal_tahun: saldo_tahun,
      saldo_awal_bulan: saldo_bulan,
      saldo_awal_nilai: saldo_nilai,
      total_penerimaan,
      total_pemakaian,
      total_retur_hilang,
      stok_akhir
    };
  });

  if (q) {
    const qLower = q.toLowerCase();
    return results.filter((o: any) =>
      o.nama_obat.toLowerCase().includes(qLower) || o.kode_obat.toLowerCase().includes(qLower)
    );
  }

  return results;
}

app.get('/api/obat/master', authenticateToken, async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  try {
    const resData = await fetchMedicinesWithStock(q);
    res.json(resData);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/obat/saldo-awal', authenticateToken, roleGuard(['admin', 'farmasi']), async (req: any, res) => {
  const { obat_id, tahun, bulan, saldo_awal_nilai } = req.body;
  if (!obat_id || !tahun || !bulan) {
    return res.status(400).json({ message: 'Obat ID, Tahun, dan Bulan wajib diisi.' });
  }

  try {
    const status = db.getDiagnosticStatus();
    if (status.isVirtual) {
      const vdb = readVirtualDb();
      const idx = vdb.obat_master.findIndex(o => o.id === Number(obat_id));
      if (idx !== -1) {
        vdb.obat_master[idx] = {
          ...vdb.obat_master[idx],
          saldo_awal_tahun: Number(tahun),
          saldo_awal_bulan: Number(bulan),
          saldo_awal_nilai: Number(saldo_awal_nilai || 0)
        };
        writeVirtualDb(vdb);
      } else {
        return res.status(404).json({ message: 'Obat tidak ditemukan.' });
      }
    } else {
      await db.query(
        'UPDATE obat_master SET saldo_awal_tahun = ?, saldo_awal_bulan = ?, saldo_awal_nilai = ? WHERE id = ?',
        [Number(tahun), Number(bulan), Number(saldo_awal_nilai || 0), Number(obat_id)]
      );
    }
    res.json({ success: true, message: 'Saldo awal tahunan berhasil disimpan.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/obat/master', authenticateToken, roleGuard(['admin', 'farmasi']), async (req, res) => {
  const { kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, safety_stock, stok_minimum, reorder_point } = req.body;
  if (!kode_obat || !nama_obat) {
    return res.status(400).json({ message: 'Kode obat dan nama obat wajib diisi.' });
  }
  try {
    const result = await db.query(
      'INSERT INTO obat_master (kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, safety_stock, stok_minimum, reorder_point, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [
        kode_obat, 
        nama_obat, 
        golongan || 'Obat Bebas', 
        satuan || '', 
        kemasan || '', 
        Number(harga_satuan || 0), 
        Number(lead_time_hari || 2),
        Number(safety_stock || 0),
        Number(stok_minimum || 0),
        Number(reorder_point || 0)
      ]
    );
    res.json({ success: true, message: 'Obat berhasil ditambahkan.', id: result.insertId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/obat/master/:id', authenticateToken, roleGuard(['admin', 'farmasi']), async (req, res) => {
  const { id } = req.params;
  const { kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, safety_stock, stok_minimum, reorder_point, is_active } = req.body;
  
  try {
    const status = db.getDiagnosticStatus();
    if (status.isVirtual) {
      const vdb = readVirtualDb();
      const idx = vdb.obat_master.findIndex(o => o.id === Number(id));
      if (idx !== -1) {
        vdb.obat_master[idx] = {
          ...vdb.obat_master[idx],
          kode_obat,
          nama_obat,
          golongan: golongan || 'Obat Bebas',
          satuan,
          kemasan,
          harga_satuan: Number(harga_satuan || 0),
          lead_time_hari: Number(lead_time_hari || 2),
          safety_stock: Number(safety_stock || 0),
          stok_minimum: Number(stok_minimum || 0),
          reorder_point: Number(reorder_point || 0),
          is_active: Number(is_active)
        };
        writeVirtualDb(vdb);
        return res.json({ success: true, message: 'Data obat berhasil diperbarui.' });
      }
      return res.status(404).json({ message: 'Obat tidak ditemukan.' });
    }

    await db.query(
      'UPDATE obat_master SET kode_obat = ?, nama_obat = ?, golongan = ?, satuan = ?, kemasan = ?, harga_satuan = ?, lead_time_hari = ?, safety_stock = ?, stok_minimum = ?, reorder_point = ?, is_active = ? WHERE id = ?',
      [
        kode_obat, 
        nama_obat, 
        golongan || 'Obat Bebas', 
        satuan, 
        kemasan, 
        Number(harga_satuan || 0), 
        Number(lead_time_hari || 2), 
        Number(safety_stock || 0), 
        Number(stok_minimum || 0), 
        Number(reorder_point || 0), 
        Number(is_active), 
        Number(id)
      ]
    );
    res.json({ success: true, message: 'Data obat berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Download template Excel (.xlsx) for master obat
app.get('/api/obat/template-excel', authenticateToken, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Master Obat');
    
    // Add headers
    worksheet.columns = [
      { header: 'Kode Obat', key: 'kode', width: 15 },
      { header: 'Nama Obat', key: 'nama', width: 30 },
      { header: 'Satuan', key: 'satuan', width: 15 },
      { header: 'Harga Satuan', key: 'harga', width: 15 },
      { header: 'Safety Stock', key: 'safety_stock', width: 15 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0D9488' } // matching teal-600 color
    };

    // Add some sample data
    worksheet.addRow({
      kode: 'OBT-001',
      nama: 'Paracetamol',
      satuan: 'Tablet',
      harga: 250,
      safety_stock: 100
    });
    
    worksheet.addRow({
      kode: 'OBT-002',
      nama: 'Amoxicillin',
      satuan: 'Kaplet',
      harga: 600,
      safety_stock: 200
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=template_master_obat.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    console.error('Failed to generate excel template:', err);
    res.status(500).json({ message: 'Gagal menghasilkan template excel.' });
  }
});

// Download template CSV (.csv) for master obat
app.get('/api/obat/template-csv', authenticateToken, async (req, res) => {
  try {
    const headers = ['Kode Obat', 'Nama Obat', 'Satuan', 'Harga Satuan', 'Safety Stock'];
    const rows = [
      ['OBT-001', 'Paracetamol', 'Tablet', '250', '100'],
      ['OBT-002', 'Amoxicillin', 'Kaplet', '600', '200']
    ];

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=template_master_obat.csv');
    res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Failed to generate csv template:', err);
    res.status(500).json({ message: 'Gagal menghasilkan template csv.' });
  }
});

// Download template CSV (.csv) for lab parameter
app.get('/api/lab/parameter/template-csv', authenticateToken, async (req, res) => {
  try {
    const headers = ['Kategori', 'Nama Parameter'];
    const rows = [
      ['HEMATOLOGI', 'Hemoglobin (Hb)'],
      ['HEMATOLOGI', 'Leukosit'],
      ['KIMIA DARAH', 'Glukosa Sewaktu'],
      ['URINALISIS', 'Protein Urin']
    ];

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=template_master_pemeriksaan.csv');
    res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('Failed to generate csv template for lab parameters:', err);
    res.status(500).json({ message: 'Gagal menghasilkan template csv.' });
  }
});

// Bulk import master data pemeriksaan (lab_parameter)
app.post('/api/lab/parameter/import-bulk', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Input "items" harus berupa array data pemeriksaan.' });
  }

  try {
    let successCount = 0;
    const status = db.getDiagnosticStatus();

    if (status.isVirtual) {
      const vdb = readVirtualDb();
      for (const item of items) {
        const kategori = String(item.kategori || '').toUpperCase().trim();
        const nama_parameter = String(item.nama_parameter || '').trim();
        if (!kategori || !nama_parameter) continue;

        const exIdx = vdb.lab_parameter.findIndex(
          p => p.kategori.toUpperCase() === kategori && p.nama_parameter.toLowerCase() === nama_parameter.toLowerCase()
        );

        if (exIdx !== -1) {
          vdb.lab_parameter[exIdx].is_active = 1;
        } else {
          vdb.lab_parameter.push({
            id: vdb.lab_parameter.length > 0 ? Math.max(...vdb.lab_parameter.map(p => p.id)) + 1 : 1,
            kategori,
            nama_parameter,
            is_active: 1
          });
        }
        successCount++;
      }
      writeVirtualDb(vdb);
    } else {
      const existing = await db.query('SELECT id, kategori, nama_parameter FROM lab_parameter');
      const existingMap = new Map();
      existing.forEach((p: any) => {
        const key = `${p.kategori.toUpperCase()}||${p.nama_parameter.toLowerCase()}`;
        existingMap.set(key, p.id);
      });

      for (const item of items) {
        const kategori = String(item.kategori || '').toUpperCase().trim();
        const nama_parameter = String(item.nama_parameter || '').trim();
        if (!kategori || !nama_parameter) continue;

        const key = `${kategori}||${nama_parameter.toLowerCase()}`;
        if (existingMap.has(key)) {
          const id = existingMap.get(key);
          await db.query('UPDATE lab_parameter SET is_active = 1 WHERE id = ?', [id]);
        } else {
          await db.query('INSERT INTO lab_parameter (kategori, nama_parameter, is_active) VALUES (?, ?, 1)', [kategori, nama_parameter]);
        }
        successCount++;
      }
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${successCount} data pemeriksaan.`
    });
  } catch (err: any) {
    console.error('Import error lab parameters:', err);
    res.status(500).json({ message: `Gagal memproses import data pemeriksaan: ${err.message}` });
  }
});

// Import master data obat from Excel
app.post('/api/obat/import', authenticateToken, roleGuard(['admin', 'farmasi']), async (req, res) => {
  const { fileBase64 } = req.body;
  if (!fileBase64) {
    return res.status(400).json({ message: 'File excel tidak ditemukan.' });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(fileBase64, 'base64');
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: 'Worksheet kosong atau tidak valid.' });
    }

    // Find the header row (scan first 10 rows)
    let headerRowIndex = 1;
    for (let r = 1; r <= 10; r++) {
      const row = worksheet.getRow(r);
      let hasKode = false;
      let hasNama = false;
      row.eachCell((cell) => {
        const val = String(cell.value || '').toLowerCase();
        if (val.includes('kode')) hasKode = true;
        if (val.includes('nama')) hasNama = true;
      });
      if (hasKode && hasNama) {
        headerRowIndex = r;
        break;
      }
    }

    const headers = worksheet.getRow(headerRowIndex);
    const colMap: { [key: string]: number } = {};
    headers.eachCell((cell, colNumber) => {
      const val = String(cell.value || '').toLowerCase();
      if (val.includes('kode')) colMap['kode'] = colNumber;
      else if (val.includes('nama')) colMap['nama'] = colNumber;
      else if (val.includes('satuan')) colMap['satuan'] = colNumber;
      else if (val.includes('kemasan')) colMap['kemasan'] = colNumber;
      else if (val.includes('harga')) colMap['harga'] = colNumber;
      else if (val.includes('safety') || val.includes('stok aman')) colMap['safety'] = colNumber;
      else if (val.includes('lead')) colMap['lead'] = colNumber;
      else if (val.includes('minimum') || val.includes('stok min')) colMap['minimum'] = colNumber;
      else if (val.includes('reorder') || val.includes('rop') || val.includes('point')) colMap['reorder'] = colNumber;
    });

    if (!colMap['kode'] || !colMap['nama']) {
      return res.status(400).json({ 
        message: 'Format salah. Kolom "Kode Obat" dan "Nama Obat" wajib ada di excel template.' 
      });
    }

    let successCount = 0;
    
    // Iterate over rows to perform upsert
    for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      
      const kodeRaw = row.getCell(colMap['kode']).value;
      const namaRaw = row.getCell(colMap['nama']).value;
      
      if (!kodeRaw || !namaRaw) continue; // skip row

      // extract code and name safely
      const kode_obat = String(kodeRaw).trim();
      const nama_obat = String(namaRaw).trim();
      if (!kode_obat || !nama_obat) continue;

      const satuan = colMap['satuan'] ? String(row.getCell(colMap['satuan']).value || 'PCS').trim() : 'PCS';
      const kemasan = colMap['kemasan'] ? String(row.getCell(colMap['kemasan']).value || 'Box').trim() : 'Box';
      
      // Harga Satuan parsing
      let hargaRaw = colMap['harga'] ? row.getCell(colMap['harga']).value : 0;
      if (hargaRaw && typeof hargaRaw === 'object') {
        hargaRaw = (hargaRaw as any).result !== undefined ? (hargaRaw as any).result : (hargaRaw as any).value;
      }
      let harga_satuan = 0;
      if (hargaRaw !== null && hargaRaw !== undefined) {
        if (typeof hargaRaw === 'number') {
          harga_satuan = hargaRaw;
        } else {
          const cleanStr = String(hargaRaw).replace(/[^\d.]/g, '');
          harga_satuan = parseFloat(cleanStr) || 0;
        }
      }

      // Lead time
      let ltRaw = colMap['lead'] ? row.getCell(colMap['lead']).value : 2;
      if (ltRaw && typeof ltRaw === 'object') {
        ltRaw = (ltRaw as any).result !== undefined ? (ltRaw as any).result : (ltRaw as any).value;
      }
      const lead_time_hari = parseInt(String(ltRaw)) || 2;

      // Safety stock
      let ssRaw = colMap['safety'] ? row.getCell(colMap['safety']).value : 0;
      if (ssRaw && typeof ssRaw === 'object') {
        ssRaw = (ssRaw as any).result !== undefined ? (ssRaw as any).result : (ssRaw as any).value;
      }
      const safety_stock = parseInt(String(ssRaw)) || 0;

      // Minimum stock
      let minRaw = colMap['minimum'] ? row.getCell(colMap['minimum']).value : 0;
      if (minRaw && typeof minRaw === 'object') {
        minRaw = (minRaw as any).result !== undefined ? (minRaw as any).result : (minRaw as any).value;
      }
      const stok_minimum = parseInt(String(minRaw)) || 0;

      // Reorder point
      let rpRaw = colMap['reorder'] ? row.getCell(colMap['reorder']).value : 0;
      if (rpRaw && typeof rpRaw === 'object') {
        rpRaw = (rpRaw as any).result !== undefined ? (rpRaw as any).result : (rpRaw as any).value;
      }
      const reorder_point = parseInt(String(rpRaw)) || 0;

      // Execute Upsert
      await db.query(
        `INSERT INTO obat_master (kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, safety_stock, stok_minimum, reorder_point, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           nama_obat = VALUES(nama_obat),
           golongan = VALUES(golongan),
           satuan = VALUES(satuan),
           kemasan = VALUES(kemasan),
           harga_satuan = VALUES(harga_satuan),
           lead_time_hari = VALUES(lead_time_hari),
           safety_stock = VALUES(safety_stock),
           stok_minimum = VALUES(stok_minimum),
           reorder_point = VALUES(reorder_point),
           is_active = 1`,
        [
          kode_obat,
          nama_obat,
          'Obat Bebas',
          satuan,
          kemasan,
          harga_satuan,
          lead_time_hari,
          safety_stock,
          stok_minimum,
          reorder_point
        ]
      );
      successCount++;
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor/memperbarui ${successCount} data master obat dari file excel.`
    });

  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ message: `Gagal memproses import excel: ${err.message}` });
  }
});

// Bulk import master data obat (integrated with virtual or real DB)
app.post('/api/obat/import-bulk', authenticateToken, roleGuard(['admin', 'farmasi']), async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ message: 'Input "items" harus berupa array data obat.' });
  }

  try {
    let successCount = 0;
    const status = db.getDiagnosticStatus();

    for (const item of items) {
      const kode_obat = String(item.kode_obat || '').trim();
      const nama_obat = String(item.nama_obat || '').trim();
      if (!kode_obat || !nama_obat) continue;

      const golongan = String(item.golongan || 'Obat Bebas').trim();
      const satuan = String(item.satuan || 'PCS').trim();
      const kemasan = String(item.kemasan || 'Box').trim();
      const harga_satuan = Number(item.harga_satuan || 0);
      const lead_time_hari = Number(item.lead_time_hari || 2);
      const safety_stock = Number(item.safety_stock || 0);
      const stok_minimum = Number(item.stok_minimum || 0);
      const reorder_point = Number(item.reorder_point || 0);

      if (status.status === 'VIRTUAL') {
        const vdb = readVirtualDb();
        const newObat = {
          id: vdb.obat_master.length > 0 ? Math.max(...vdb.obat_master.map((o: any) => o.id)) + 1 : 1,
          kode_obat,
          nama_obat,
          golongan,
          satuan,
          kemasan,
          harga_satuan,
          lead_time_hari,
          safety_stock,
          stok_minimum,
          reorder_point,
          is_active: 1
        };

        const exIdx = vdb.obat_master.findIndex((o: any) => String(o.kode_obat).toLowerCase() === kode_obat.toLowerCase());
        if (exIdx !== -1) {
          vdb.obat_master[exIdx] = {
            ...vdb.obat_master[exIdx],
            ...newObat,
            id: vdb.obat_master[exIdx].id,
            is_active: 1
          };
        } else {
          vdb.obat_master.push(newObat);
        }
        writeVirtualDb(vdb);
      } else {
        await db.query(
          `INSERT INTO obat_master (kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, safety_stock, stok_minimum, reorder_point, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE
             nama_obat = VALUES(nama_obat),
             golongan = VALUES(golongan),
             satuan = VALUES(satuan),
             kemasan = VALUES(kemasan),
             harga_satuan = VALUES(harga_satuan),
             lead_time_hari = VALUES(lead_time_hari),
             safety_stock = VALUES(safety_stock),
             stok_minimum = VALUES(stok_minimum),
             reorder_point = VALUES(reorder_point),
             is_active = 1`,
          [
            kode_obat,
            nama_obat,
            golongan,
            satuan,
            kemasan,
            harga_satuan,
            lead_time_hari,
            safety_stock,
            stok_minimum,
            reorder_point
          ]
        );
      }
      successCount++;
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor/memperbarui ${successCount} data master obat.`
    });

  } catch (err: any) {
    console.error('Import bulk error:', err);
    res.status(500).json({ message: `Gagal memproses bulk import: ${err.message}` });
  }
});

app.delete('/api/obat/master/:id', authenticateToken, roleGuard(['admin', 'farmasi']), async (req, res) => {
  const { id } = req.params;
  try {
    const status = db.getDiagnosticStatus();
    if (status.isVirtual) {
      const vdb = readVirtualDb();
      const idx = vdb.obat_master.findIndex(o => o.id === Number(id));
      if (idx !== -1) {
        vdb.obat_master[idx].is_active = 0; // Soft delete
        writeVirtualDb(vdb);
        return res.json({ success: true, message: 'Obat berhasil dinonaktifkan.' });
      }
      return res.status(404).json({ message: 'Obat tidak ditemukan.' });
    }

    await db.query('UPDATE obat_master SET is_active = 0 WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Obat berhasil dinonaktifkan.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/obat/konsumsi', authenticateToken, async (req, res) => {
  const { tanggal, bulan, tahun, start_date, end_date } = req.query;
  try {
    if (start_date && end_date) {
      const rows = await db.query(
        'SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_harian c JOIN obat_master o ON c.obat_id = o.id WHERE c.tanggal >= ? AND c.tanggal <= ?',
        [String(start_date), String(end_date)]
      );
      res.json(rows);
    } else if (tanggal) {
      const rows = await db.query(
        'SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_harian c JOIN obat_master o ON c.obat_id = o.id WHERE c.tanggal = ?',
        [String(tanggal)]
      );
      res.json(rows);
    } else if (bulan && tahun) {
      const rows = await db.query(
        'SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_bulanan c JOIN obat_master o ON c.obat_id = o.id WHERE c.bulan = ? AND c.tahun = ?',
        [Number(bulan), Number(tahun)]
      );
      res.json(rows);
    } else {
      res.status(450).json({ message: 'Parameter tanggal atau bulan/tahun wajib diisi.' });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/obat/konsumsi', authenticateToken, roleGuard(['admin', 'farmasi']), async (req: any, res) => {
  const { tanggal, obat_id, stok_awal, penerimaan, pemakaian, retur_hilang } = req.body;
  if (!tanggal || !obat_id) {
    return res.status(400).json({ message: 'Informasi obat dan tanggal harus lengkap.' });
  }

  const sisa_stok = Number(stok_awal || 0) + Number(penerimaan || 0) - Number(pemakaian || 0) - Number(retur_hilang || 0);

  try {
    // 1. Insert/Update Harian
    await db.query(
      'INSERT INTO obat_konsumsi_harian (obat_id, tanggal, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE stok_awal = VALUES(stok_awal), penerimaan = VALUES(penerimaan), pemakaian = VALUES(pemakaian), retur_hilang = VALUES(retur_hilang), sisa_stok = VALUES(sisa_stok), input_by = VALUES(input_by)',
      [Number(obat_id), String(tanggal), Number(stok_awal || 0), Number(penerimaan || 0), Number(pemakaian || 0), Number(retur_hilang || 0), sisa_stok, req.user.id]
    );

    // 2. Extract bulan & tahun from tanggal
    const dateObj = new Date(tanggal);
    const bulan = dateObj.getMonth() + 1;
    const tahun = dateObj.getFullYear();

    // 3. Recalculate monthly values from harian
    const harianRows = await db.query(
      'SELECT * FROM obat_konsumsi_harian WHERE obat_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ? ORDER BY tanggal ASC',
      [Number(obat_id), bulan, tahun]
    );

    if (harianRows.length > 0) {
      const firstRow = harianRows[0];
      const lastRow = harianRows[harianRows.length - 1];

      const monthly_stok_awal = firstRow.stok_awal;
      let monthly_penerimaan = 0;
      let monthly_pemakaian = 0;
      let monthly_retur_hilang = 0;

      harianRows.forEach((row: any) => {
        monthly_penerimaan += row.penerimaan;
        monthly_pemakaian += row.pemakaian;
        monthly_retur_hilang += row.retur_hilang;
      });

      const monthly_sisa_stok = lastRow.sisa_stok;

      // 4. Update the monthly aggregated table
      await db.query(
        'INSERT INTO obat_konsumsi_bulanan (obat_id, bulan, tahun, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE stok_awal = VALUES(stok_awal), penerimaan = VALUES(penerimaan), pemakaian = VALUES(pemakaian), retur_hilang = VALUES(retur_hilang), sisa_stok = VALUES(sisa_stok), input_by = VALUES(input_by)',
        [Number(obat_id), bulan, tahun, monthly_stok_awal, monthly_penerimaan, monthly_pemakaian, monthly_retur_hilang, monthly_sisa_stok, req.user.id]
      );
    }

    res.json({ success: true, message: 'Laporan harian konsumsi obat berhasil disimpan.', sisa_stok });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


/* ------ 5. FORECASTING & INVENTORY INTEL (ABC Analysis) ------ */

// Calculate 3-month moving average forecasting
app.get('/api/obat/forecast', authenticateToken, async (req, res) => {
  const { bulan, tahun } = req.query;
  if (!bulan || !tahun) {
    return res.status(400).json({ message: 'Bulan dan tahun proyeksi wajib diisi.' });
  }

  const bProj = Number(bulan);
  const tProj = Number(tahun);

  try {
    // 1. Get all active medicines
    const medicines = await db.query('SELECT * FROM obat_master WHERE is_active = 1');
    
    // 2. We need past consumption records to compute moving average
    // To forecast for (bProj, tProj), we need prior 3 months: (M-1, M-2, M-3)
    const prevMonths: { b: number; t: number }[] = [];
    let b = bProj;
    let t = tProj;
    for (let i = 0; i < 3; i++) {
      b--;
      if (b === 0) {
        b = 12;
        t--;
      }
      prevMonths.push({ b, t });
    }

    // Load consumption logs
    const allConsumption = await db.query(
      'SELECT obat_id, bulan, tahun, pemakaian, sisa_stok FROM obat_konsumsi_bulanan'
    );

    const forecasts = [];

    // Find actual target month data if it exists to match ABC analysis exactly
    const targetMonthLogs = allConsumption.filter((c: any) => c.bulan === bProj && c.tahun === tProj);
    const hasTargetData = targetMonthLogs.length > 0;

    // Check if we have consumption logs for the most recent historical month (M-1)
    const m1 = prevMonths[0];
    const m1Logs = allConsumption.filter((c: any) => c.bulan === m1.b && c.tahun === m1.t);
    const hasM1Data = m1Logs.length > 0;

    // We'll calculate an ABC valuation list to assign categories
    const valuationList = [];

    for (const medicine of medicines) {
      const records = prevMonths.map(pm => {
        return allConsumption.find(
          (c: any) => c.obat_id === medicine.id && c.bulan === pm.b && c.tahun === pm.t
        );
      });

      // Average consumption calculation
      const pemakaian_3_bulan = records.reduce((sum, r) => sum + (r ? Number(r.pemakaian) : 0), 0);
      
      // 1. Rata-rata = Pemakaian 3 bulan ÷ 3
      const rata_rata = Math.round(pemakaian_3_bulan / 3);
      
      // 2. Safety Stock = Rata-rata × 2
      const safety_stock = Math.round(rata_rata * 2);

      // 3. Forecast bulan 1-3 = Rata-rata
      const forecast_bulan_1 = rata_rata;
      const forecast_bulan_2 = rata_rata;
      const forecast_bulan_3 = rata_rata;

      // 4. Total Kebutuhan = Forecast1 + Forecast2 + Forecast3
      const total_kebutuhan = forecast_bulan_1 + forecast_bulan_2 + forecast_bulan_3;

      // Find current sisa_stok (taking the latest consumption log)
      const lastRec = allConsumption
        .filter((c: any) => c.obat_id === medicine.id)
        .sort((a: any, b: any) => (b.tahun * 12 + b.bulan) - (a.tahun * 12 + a.bulan))[0];
      
      const stok_akhir = lastRec ? lastRec.sisa_stok : 0;

      // 5. Qty Order = Total Kebutuhan + Safety Stock - Stok Akhir
      const qty_order = Math.max(0, total_kebutuhan + safety_stock - stok_akhir);

      const current_stock = stok_akhir;
      const reorder_qty = total_kebutuhan + safety_stock;
      const status_stok = current_stock < reorder_qty ? 'Kritis (Perlu Order)' : 'Aman';

      // Base pemakaian for ABC analysis (use target month logs if available to align with ABC analysis page)
      let abcPemakaian = 0;
      if (hasTargetData) {
        const targetLog = targetMonthLogs.find((c: any) => c.obat_id === medicine.id);
        abcPemakaian = targetLog ? Number(targetLog.pemakaian) : 0;
      } else if (hasM1Data) {
        const m1LogForDrug = m1Logs.find((c: any) => c.obat_id === medicine.id);
        abcPemakaian = m1LogForDrug ? Number(m1LogForDrug.pemakaian) : 0;
      } else {
        abcPemakaian = pemakaian_3_bulan; // fallback to 3-month cumulative consumption
      }

      const hashPrice = Number(medicine.harga_satuan || 0);
      const total_nilai = abcPemakaian * hashPrice;

      valuationList.push({
        id: medicine.id,
        total_nilai
      });

      forecasts.push({
        id: medicine.id,
        kode_obat: medicine.kode_obat,
        nama_obat: medicine.nama_obat,
        proyeksi_kebutuhan: total_kebutuhan, // Keep for dashboard compatibility 3-month total
        safety_stock,
        reorder_qty,
        current_stock,
        status_stok,
        lead_time_hari: medicine.lead_time_hari,
        pemakaian_3_bulan,
        rata_rata,
        forecast_bulan_1,
        forecast_bulan_2,
        forecast_bulan_3,
        total_kebutuhan,
        stok_akhir,
        qty_order,
        kelas_abc: 'C' // default placeholder
      });
    }

    // Sort valuation list to compute final Pareto/ABC classes
    valuationList.sort((a, b) => b.total_nilai - a.total_nilai);
    const grandTotalValue = valuationList.reduce((sum, item) => sum + item.total_nilai, 0);

    let runningSum = 0;
    const abcCategoriesMap = new Map();

    for (const valItem of valuationList) {
      runningSum += valItem.total_nilai;
      const kumulatif_persen = grandTotalValue > 0 ? (runningSum / grandTotalValue) * 100 : 0;
      
      let klasifikasi = 'C';
      if (kumulatif_persen <= 80 && valItem.total_nilai > 0) {
        klasifikasi = 'A';
      } else if (kumulatif_persen <= 95 && valItem.total_nilai > 0) {
        klasifikasi = 'B';
      }
      abcCategoriesMap.set(valItem.id, klasifikasi);
    }

    // Update forecasts with calculated ABC class
    for (const f of forecasts) {
      if (f.id && abcCategoriesMap.has(f.id)) {
        f.kelas_abc = abcCategoriesMap.get(f.id);
      }
    }

    res.json(forecasts);

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// ABC Inventory value classification Analysis
app.get('/api/obat/abc', authenticateToken, async (req, res) => {
  const { bulan, tahun } = req.query;
  if (!bulan || !tahun) {
    return res.status(400).json({ message: 'Bulan dan tahun analisis wajib diisi.' });
  }

  try {
    // Cumulative calculation over consumption: Value = Usage * Unit Price
    const rows = await db.query(
      `SELECT c.pemakaian, o.id as obat_id, o.nama_obat, o.kode_obat, o.harga_satuan, o.golongan
       FROM obat_konsumsi_bulanan c
       JOIN obat_master o ON c.obat_id = o.id
       WHERE c.bulan = ? AND c.tahun = ?`,
      [Number(bulan), Number(tahun)]
    );

    if (rows.length === 0) {
      return res.json([]);
    }

    // 1. Calculate total consumption value for each drug
    let list = rows.map((r: any) => {
      const total_nilai = Number(r.pemakaian) * Number(r.harga_satuan);
      return {
        obat_id: r.obat_id,
        kode_obat: r.kode_obat,
        nama_obat: r.nama_obat,
        golongan: r.golongan,
        pemakaian: Number(r.pemakaian),
        harga_satuan: Number(r.harga_satuan),
        total_nilai
      };
    });

    // 2. Sort drug list in descending order of value
    list.sort((a: any, b: any) => b.total_nilai - a.total_nilai);

    // 3. Compute total clinic drug spend for this period
    const grandTotalValue = list.reduce((sum: number, x: any) => sum + x.total_nilai, 0);

    // 4. Calculate cumulative percentage & assign ABC category (items with total_nilai <= 0 are strictly Class C)
    let runningSum = 0;
    const abcResult = list.map((item: any) => {
      runningSum += item.total_nilai;
      const kumulatif_persen = grandTotalValue > 0 ? (runningSum / grandTotalValue) * 100 : 0;
      
      let klasifikasi = 'C';
      if (item.total_nilai > 0) {
        if (kumulatif_persen <= 80) {
          klasifikasi = 'A';
        } else if (kumulatif_persen <= 95) {
          klasifikasi = 'B';
        }
      }

      return {
        ...item,
        kumulatif_persen: parseFloat(kumulatif_persen.toFixed(2)),
        kontribusi_persen: grandTotalValue > 0 ? parseFloat(((item.total_nilai / grandTotalValue) * 100).toFixed(2)) : 0,
        klasifikasi
      };
    });

    res.json({
      items: abcResult,
      total_investasi: grandTotalValue
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Stock alerts (current stock is below reorder points)
app.get('/api/obat/alert', authenticateToken, async (req, res) => {
  try {
    // Use last month's forecast matrix to flag low inventory
    const d = new Date();
    const curMonth = d.getMonth() + 1;
    const curYear = d.getFullYear();

    // Reuse mathematical forecasting system
    const medicines = await db.query('SELECT * FROM obat_master WHERE is_active = 1');
    const allConsumption = await db.query('SELECT obat_id, bulan, tahun, pemakaian, sisa_stok FROM obat_konsumsi_bulanan');

    const lowStockAlerts = [];

    for (const medicine of medicines) {
      const priorLogs = allConsumption
        .filter((c: any) => c.obat_id === medicine.id)
        .sort((a: any, b: any) => (b.tahun * 12 + b.bulan) - (a.tahun * 12 + a.bulan));

      const lastRec = priorLogs[0];
      const current_stock = lastRec ? lastRec.sisa_stok : 0;

      // Forecast moving average demand
      const validForAvg = priorLogs.slice(0, 3);
      const pemakaian_3_bulan = validForAvg.reduce((sum, r) => sum + r.pemakaian, 0);
      const rata_rata = Math.round(pemakaian_3_bulan / 3);
      const safety_stock = Math.round(rata_rata * 2);
      const total_kebutuhan = rata_rata * 3;
      const reorder_qty = total_kebutuhan + safety_stock;

      if (current_stock < reorder_qty) {
        lowStockAlerts.push({
          id: medicine.id,
          kode_obat: medicine.kode_obat,
          nama_obat: medicine.nama_obat,
          current_stock,
          reorder_qty,
          proyeksi_demand: total_kebutuhan,
          safety_stock,
          deficit: reorder_qty - current_stock,
          lead_time_hari: medicine.lead_time_hari
        });
      }
    }
    res.json(lowStockAlerts);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


/* ==================== 6. ADMINISTRATION ACCOUNTS ==================== */

app.get('/api/admin/users', authenticateToken, roleGuard(['admin']), async (req, res) => {
  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable.'
    });
  }
  try {
    const url = BASEROW_TABLE_URL;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    const rows = response.data.results || [];
    const formattedUsers = rows.map((r: any) => {
      const role = helperExtractRole(r.Peran, r.Divisi);
      
      let divStr = '';
      if (r.Divisi) {
        if (typeof r.Divisi === 'string') {
          divStr = r.Divisi;
        } else if (Array.isArray(r.Divisi)) {
          divStr = r.Divisi.map((d: any) => (d && typeof d === 'object') ? (d.value || d.name) : String(d)).join(' ');
        } else if (typeof r.Divisi === 'object' && r.Divisi !== null) {
          divStr = r.Divisi.value || r.Divisi.name || JSON.stringify(r.Divisi);
        } else {
          divStr = String(r.Divisi);
        }
      }

      return {
        id: r.id,
        nama: r['Nama Karyawan'] || 'Karyawan Puri Medika',
        email: r.Email || '',
        role: role,
        divisi: divStr || 'IT',
        created_at: r['Created At'] || new Date().toISOString()
      };
    });
    res.json(formattedUsers);
  } catch (err: any) {
    console.error('Failed to fetch users from Baserow:', err.message);
    res.status(500).json({ message: `Gagal mengambil data pengguna dari Baserow: ${err.message}` });
  }
});

app.post('/api/admin/users', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { nama, email, role } = req.body;
  if (!nama || !email || !role) {
    return res.status(400).json({ message: 'Input pendaftaran akun tidak lengkap.' });
  }

  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable.'
    });
  }

  try {
    let divisiVal = 'IT';
    let peranVal = 'admin';
    if (role === 'lab' || role === 'analis') {
      divisiVal = 'Laboratorium';
      peranVal = 'analis';
    } else if (role === 'perawat') {
      divisiVal = 'Laboratorium';
      peranVal = 'perawat';
    } else if (role === 'farmasi') {
      divisiVal = 'Farmasi';
      peranVal = 'farmasi';
    } else if (role === 'admin') {
      divisiVal = 'IT';
      peranVal = 'admin';
    }

    const payload = {
      'Nama Karyawan': nama,
      'Email': email,
      'Divisi': divisiVal,
      'Peran': peranVal,
      'OTP 2': '',
      'OTP 2 Expired': null
    };

    const postUrl = `${BASEROW_BASE_URL}/?user_field_names=true`;
    await axios.post(postUrl, payload, {
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Akun petugas baru berhasil didaftarkan langsung ke Baserow!' });
  } catch (err: any) {
    console.error('Failed to create user in Baserow:', err.response?.data || err.message);
    res.status(500).json({ 
      message: `Gagal mendaftarkan akun di Baserow: ${JSON.stringify(err.response?.data) || err.message}` 
    });
  }
});

app.put('/api/admin/users/:id', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nama, email, role } = req.body;

  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable.'
    });
  }

  try {
    let divisiVal = 'IT';
    let peranVal = 'admin';
    if (role === 'lab' || role === 'analis') {
      divisiVal = 'Laboratorium';
      peranVal = 'analis';
    } else if (role === 'perawat') {
      divisiVal = 'Laboratorium';
      peranVal = 'perawat';
    } else if (role === 'farmasi') {
      divisiVal = 'Farmasi';
      peranVal = 'farmasi';
    } else if (role === 'admin') {
      divisiVal = 'IT';
      peranVal = 'admin';
    }

    const payload = {
      'Nama Karyawan': nama,
      'Email': email,
      'Divisi': divisiVal,
      'Peran': peranVal
    };

    const patchUrl = `${BASEROW_BASE_URL}/${id}/?user_field_names=true`;
    await axios.patch(patchUrl, payload, {
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Akun berhasil diperbarui langsung ke Baserow.' });
  } catch (err: any) {
    console.error('Failed to update user in Baserow:', err.response?.data || err.message);
    res.status(500).json({ 
      message: `Gagal memperbarui akun di Baserow: ${JSON.stringify(err.response?.data) || err.message}` 
    });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
  }

  if (!BASEROW_API_TOKEN || !BASEROW_TABLE_URL || !BASEROW_BASE_URL) {
    return res.status(500).json({ 
      message: 'Konfigurasi integrasi Baserow belum lengkap di environment variable.'
    });
  }

  try {
    const deleteUrl = `${BASEROW_BASE_URL}/${id}/`;
    await axios.delete(deleteUrl, {
      headers: {
        'Authorization': `Token ${BASEROW_API_TOKEN}`
      }
    });
    res.json({ success: true, message: 'Akun petugas berhasil dihapus dari Baserow.' });
  } catch (err: any) {
    console.error('Failed to delete user in Baserow:', err.response?.data || err.message);
    res.status(500).json({ 
      message: `Gagal menghapus akun di Baserow: ${JSON.stringify(err.response?.data) || err.message}` 
    });
  }
});

app.post('/api/admin/reset-password', authenticateToken, roleGuard(['admin']), async (req, res) => {
  res.json({ success: true, message: 'Otentikasi Puri Medika berbasis login OTP tanpa password. Tidak perlu mereset sandi.' });
});


/* ==================== 7. EXCEL REPORT EXPORTS ==================== */

// Export Laboratory records to spreadsheet
app.get('/api/lab/export', authenticateToken, roleGuard(['admin', 'lab', 'perawat', 'analis']), async (req, res) => {
  const { bulan, tahun, start_bulan, start_tahun, end_bulan, end_tahun } = req.query;
  try {
    let rows;
    if (start_bulan && start_tahun && end_bulan && end_tahun) {
      const startDay = '01';
      const lastDay = new Date(Number(end_tahun), Number(end_bulan), 0).getDate();
      const startDate = `${start_tahun}-${String(start_bulan).padStart(2, '0')}-${startDay}`;
      const endDate = `${end_tahun}-${String(end_bulan).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      rows = await db.query(
        `SELECT SUM(d.jumlah) as jumlah, d.parameter_id, p.nama_parameter, p.kategori, MAX(d.created_at) as created_at
         FROM lab_data_harian d 
         JOIN lab_parameter p ON d.parameter_id = p.id 
         WHERE d.tanggal BETWEEN ? AND ? 
         GROUP BY d.parameter_id, p.nama_parameter, p.kategori`,
        [startDate, endDate]
      );
    } else {
      rows = await db.query(
        `SELECT SUM(d.jumlah) as jumlah, d.parameter_id, p.nama_parameter, p.kategori, MAX(d.created_at) as created_at
         FROM lab_data_harian d 
         JOIN lab_parameter p ON d.parameter_id = p.id 
         WHERE MONTH(d.tanggal) = ? AND YEAR(d.tanggal) = ? 
         GROUP BY d.parameter_id, p.nama_parameter, p.kategori`,
        [Number(bulan), Number(tahun)]
      );
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Lab');

    sheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Kategori', key: 'kategori', width: 25 },
      { header: 'Parameter Pemeriksaan', key: 'parameter', width: 35 },
      { header: 'Jumlah Pemeriksaan (Total)', key: 'jumlah', width: 25 },
      { header: 'Last Update', key: 'tanggal', width: 25 }
    ];

    // Style Headers
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '10B981' } };

    rows.forEach((r: any, idx: number) => {
      sheet.addRow({
        no: idx + 1,
        kategori: r.kategori,
        parameter: r.nama_parameter,
        jumlah: Number(r.jumlah || 0),
        tanggal: r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Laporan_Lab_${bulan}_${tahun}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err: any) {
    res.status(500).json({ message: `Gagal mengekspor laporan: ${err.message}` });
  }
});

// Export Medicines Consumption and Forecast metrics to spreadsheet
app.get('/api/obat/export', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { bulan, tahun } = req.query;
  try {
    const rows = await db.query(
      'SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.golongan, u.nama as input_by_user FROM obat_konsumsi_bulanan c JOIN obat_master o ON c.obat_id = o.id LEFT JOIN users u ON c.input_by = u.id WHERE c.bulan = ? AND c.tahun = ?',
      [Number(bulan), Number(tahun)]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Laporan Konsumsi Obat');

    sheet.columns = [
      { header: 'No', key: 'no', width: 8 },
      { header: 'Kode Obat', key: 'kode', width: 15 },
      { header: 'Nama Obat', key: 'nama', width: 30 },
      { header: 'Golongan', key: 'golongan', width: 20 },
      { header: 'Stok Awal', key: 'stok_awal', width: 12 },
      { header: 'Penerimaan', key: 'penerimaan', width: 12 },
      { header: 'Pemakaian', key: 'pemakaian', width: 12 },
      { header: 'Retur/Hilang', key: 'retur_hilang', width: 14 },
      { header: 'Sisa Stok', key: 'sisa_stok', width: 12 },
      { header: 'Harga Satuan', key: 'harga', width: 18 },
      { header: 'Total Nilai (Rp)', key: 'total_nilai', width: 20 },
      { header: 'Petugas', key: 'user', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };

    rows.forEach((r: any, idx: number) => {
      sheet.addRow({
        no: idx + 1,
        kode: r.kode_obat,
        nama: r.nama_obat,
        golongan: r.golongan || '-',
        stok_awal: r.stok_awal,
        penerimaan: r.penerimaan,
        pemakaian: r.pemakaian,
        retur_hilang: r.retur_hilang || 0,
        sisa_stok: r.sisa_stok,
        harga: r.harga_satuan,
        total_nilai: r.pemakaian * r.harga_satuan,
        user: r.input_by_user || 'Sistem'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Laporan_Konsumsi_Obat_${bulan}_${tahun}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err: any) {
    res.status(500).json({ message: `Gagal mengekspor laporan obat: ${err.message}` });
  }
});


/* ==================== 8. DEVELOPMENT FRONT-END SERVING ==================== */

// Setup Vite Dev server or static files depending on the environment
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express] Server running on port ${PORT}`);
  });
}

startServer();
