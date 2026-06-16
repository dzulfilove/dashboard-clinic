import express from 'express';
import path from 'path';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { db, initializeDatabase, readVirtualDb, writeVirtualDb } from './src/db/connection.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'klinik_puri_medika_secret_key_2026';

// Middelewares
app.use(cors());
app.use(express.json());

// Initialize Database (real VPS MySQL or fall back to virtual DB)
initializeDatabase().then((dbStatus) => {
  console.log(`Database initialized in mode: ${dbStatus.status}`);
});

// Middleware for JWT Authenticative verification
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid.' });
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

/* ==================== 1. DIAGNOSTIC SERVICES ==================== */

app.get('/api/db/status', async (req, res) => {
  const status = db.getDiagnosticStatus();
  res.json(status);
});

app.post('/api/db/test-connection', async (req, res) => {
  const { host, user, password, database, port } = req.body;
  try {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.default.createConnection({
      host,
      user,
      password,
      database,
      port: Number(port || 3306),
      connectTimeout: 5000,
    });
    await connection.query('SELECT 1');
    await connection.end();
    res.json({ success: true, message: 'Koneksi ke VPS MySQL berhasil!' });
  } catch (err: any) {
    res.json({ success: false, message: `Gagal menghubungkan: ${err.message}` });
  }
});

app.post('/api/db/run-migrations', async (req, res) => {
  const status = db.getDiagnosticStatus();
  if (status.isVirtual) {
    return res.status(400).json({ success: false, message: 'Fitur migrasi hanya dapat dilakukan pada VPS MySQL.' });
  }
  try {
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

      for (const query of queries) {
        await db.query(query);
      }
      res.json({ success: true, message: 'Migrasi schema database ke VPS MySQL berhasil!' });
    } else {
      res.status(404).json({ success: false, message: 'File schema.sql tidak ditemukan.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Gagal menjalankan migrasi: ${err.message}` });
  }
});


/* ==================== 2. AUTHENTICATION SERVICES ==================== */

// Helper to send email OTP using Nodemailer
async function sendOTPEmail(toEmail: string, otpCode: string, name: string): Promise<{ sent: boolean; messageUrl?: string; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || 'purimedikadev@gmail.com';
  const pass = process.env.SMTP_PASS || 'szgi dyfu gchg dueh';
  const from = process.env.SMTP_FROM || '"Klinik Puri Medika" <purimedikadev@gmail.com>';

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
      console.log('Using Gmail SMTP delivery via purimedikadev@gmail.com');
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
      subject: `[Klinik Puri Medika] Kode OTP 2 Keamanan Login Anda`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px;">
            <h1 style="color: #0f766e; margin: 0; font-size: 24px;">Klinik Puri Medika</h1>
            <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">Otentikasi Dua Faktor Keamanan Sistem</p>
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

  try {
    // Fetch all rows from Baserow table 936
    const url = 'https://baserow.purimedikabdl.com/api/database/rows/table/936/?user_field_names=true';
    const response = await axios.get(url, {
      headers: {
        'Authorization': 'Token mkOgOkWWte0XIoXwuXqw06LwtzhnBiG2',
        'Accept': 'application/json'
      }
    });

    const rows = response.data.results || [];
    const userRow = rows.find((r: any) => r.Email && r.Email.toLowerCase().trim() === email.toLowerCase().trim());

    if (!userRow) {
      return res.status(404).json({ message: 'Alamat email tidak terdaftar dalam database Baserow.' });
    }

    const userName = userRow['Nama Karyawan'] || 'Karyawan Puri Medika';

    // Generate a 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiry to 10 minutes from now
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update Baserow row matching userRow.id
    const patchUrl = `https://baserow.purimedikabdl.com/api/database/rows/table/936/${userRow.id}/?user_field_names=true`;
    await axios.patch(patchUrl, {
      'OTP 2': otp,
      'OTP 2 Expired': expiry
    }, {
      headers: {
        'Authorization': 'Token mkOgOkWWte0XIoXwuXqw06LwtzhnBiG2',
        'Content-Type': 'application/json'
      }
    });

    // Send the email via Nodemailer
    const emailRes = await sendOTPEmail(email.toLowerCase().trim(), otp, userName);

    res.json({
      success: true,
      message: emailRes.messageUrl 
        ? `Kode OTP 2 berhasil diperbarui di Baserow & dikirimkan ke email simulasi.`
        : `Kode OTP 2 berhasil dikirim ke email: ${email}`,
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

  try {
    // Fetch all rows from Baserow table 936
    const url = 'https://baserow.purimedikabdl.com/api/database/rows/table/936/?user_field_names=true';
    const response = await axios.get(url, {
      headers: {
        'Authorization': 'Token mkOgOkWWte0XIoXwuXqw06LwtzhnBiG2',
        'Accept': 'application/json'
      }
    });

    const rows = response.data.results || [];
    const userRow = rows.find((r: any) => r.Email && r.Email.toLowerCase().trim() === email.toLowerCase().trim());

    if (!userRow) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const savedOtp = userRow['OTP 2'] ? String(userRow['OTP 2']).trim() : '';
    const expiryStr = userRow['OTP 2 Expired'];

    if (!savedOtp || savedOtp !== String(otp).trim()) {
      return res.status(401).json({ message: 'Kode OTP yang dimasukkan tidak cocok.' });
    }

    if (expiryStr) {
      const expiryDate = new Date(expiryStr);
      if (expiryDate.getTime() < Date.now()) {
        return res.status(401).json({ message: 'Kode OTP telah kedaluwarsa. Silakan minta ulang.' });
      }
    }

    // Provision or track user in our local sql/virtual database
    const localUsers = await db.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    
    let localUserId: number;
    let localUserName = userRow['Nama Karyawan'] || 'Karyawan Puri Medika';
    let localUserRole = 'admin'; // default role

    // Determine role by mapping row's Divisi field robustly
    let divStr = '';
    if (userRow.Divisi) {
      if (typeof userRow.Divisi === 'string') {
        divStr = userRow.Divisi;
      } else if (typeof userRow.Divisi === 'object') {
        divStr = userRow.Divisi.value || userRow.Divisi.name || JSON.stringify(userRow.Divisi);
      } else {
        divStr = String(userRow.Divisi);
      }
    }
    const div = divStr.toLowerCase();
    if (div.includes('it') || div.includes('admin') || div.includes('it divisi') || div.includes('owner')) {
      localUserRole = 'admin';
    } else if (div.includes('lab') || div.includes('laboratorium')) {
      localUserRole = 'lab';
    } else if (div.includes('farmasi') || div.includes('apotek') || div.includes('apoteker')) {
      localUserRole = 'farmasi';
    }

    if (localUsers.length === 0) {
      // Create user record locally
      const hash = await bcrypt.hash('otp_secured_account_purimedika', 10);
      const insertResult = await db.query(
        'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [localUserName, email.toLowerCase().trim(), hash, localUserRole]
      );
      
      const freshlyCreated = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      localUserId = freshlyCreated[0]?.id || 100 + Math.floor(Math.random() * 100);
    } else {
      localUserId = localUsers[0].id;
      localUserName = localUsers[0].nama;
      localUserRole = localUsers[0].role;
      
      // Update role and name to keep synced with Baserow (using the compliant simulation/SQL query)
      await db.query(
        'UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?',
        [localUserName, email.toLowerCase().trim(), localUserRole, Number(localUserId)]
      );
    }

    // Sign JWT
    const token = jwt.sign(
      { id: localUserId, nama: localUserName, email: email.toLowerCase().trim(), role: localUserRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Optional: clear OTP in Baserow to make it single-use
    const patchUrl = `https://baserow.purimedikabdl.com/api/database/rows/table/936/${userRow.id}/?user_field_names=true`;
    await axios.patch(patchUrl, {
      'OTP 2': '',
      'OTP 2 Expired': null
    }, {
      headers: {
        'Authorization': 'Token mkOgOkWWte0XIoXwuXqw06LwtzhnBiG2',
        'Content-Type': 'application/json'
      }
    }).catch((e: any) => console.warn('Failed to clean OTP 2 in Baserow:', e.message));

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
    const users = await db.query('SELECT id, nama, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    res.json(users[0]);
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
app.post('/api/lab/parameter', authenticateToken, roleGuard(['admin', 'lab']), async (req: any, res) => {
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
app.put('/api/lab/parameter/:id', authenticateToken, roleGuard(['admin', 'lab']), async (req: any, res) => {
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
app.delete('/api/lab/parameter/:id', authenticateToken, roleGuard(['admin', 'lab']), async (req: any, res) => {
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
app.post('/api/lab/data', authenticateToken, roleGuard(['admin', 'lab']), async (req: any, res) => {
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
app.put('/api/lab/data/:id', authenticateToken, roleGuard(['admin', 'lab']), async (req: any, res) => {
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


/* ==================== 4. PHARMACY ENDPOINTS ==================== */

app.get('/api/obat/master', authenticateToken, async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  try {
    const rows = await db.query('SELECT * FROM obat_master WHERE is_active = 1');
    let resData = rows;
    if (q) {
      const qLower = q.toLowerCase();
      resData = rows.filter((o: any) =>
        o.nama_obat.toLowerCase().includes(qLower) || o.kode_obat.toLowerCase().includes(qLower)
      );
    }
    res.json(resData);
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
  const { tanggal, bulan, tahun } = req.query;
  try {
    if (tanggal) {
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

    for (const medicine of medicines) {
      const records = prevMonths.map(pm => {
        return allConsumption.find(
          (c: any) => c.obat_id === medicine.id && c.bulan === pm.b && c.tahun === pm.t
        );
      });

      // Average consumption calculation
      const validRecords = records.filter(r => r !== undefined);
      const totalPemakaian = validRecords.reduce((sum, r) => sum + r.pemakaian, 0);
      
      // Moving average is either average of existing logs or 0 if none
      const proyeksi_kebutuhan = validRecords.length > 0 
        ? Math.round(totalPemakaian / validRecords.length) 
        : 0;

      // Safety stock formula: (Average Demand × Lead Time) / 30 (normalized to month)
      // Standard lead time is in days. For security safety stock buffer:
      // Safety Stock = Proyeksi Kebutuhan * (Lead Time Hari / 30) * 1.5 (safety multiplier)
      const leadTimeMultiplier = (medicine.lead_time_hari || 2) / 30;
      const safety_stock = Math.round(proyeksi_kebutuhan * leadTimeMultiplier * 1.5) || 5;

      const reorder_qty = proyeksi_kebutuhan + safety_stock;

      // Find current sisa_stok (taking the latest consumption log)
      const lastRec = allConsumption
        .filter((c: any) => c.obat_id === medicine.id)
        .sort((a: any, b: any) => (b.tahun * 12 + b.bulan) - (a.tahun * 12 + a.bulan))[0];
      
      const current_stock = lastRec ? lastRec.sisa_stok : 0;
      const status_stok = current_stock < reorder_qty ? 'Kritis (Perlu Order)' : 'Aman';

      forecasts.push({
        id: medicine.id,
        kode_obat: medicine.kode_obat,
        nama_obat: medicine.nama_obat,
        proyeksi_kebutuhan,
        safety_stock,
        reorder_qty,
        current_stock,
        status_stok,
        lead_time_hari: medicine.lead_time_hari
      });
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

    // 4. Calculate cumulative percentage & assign ABC category
    let runningSum = 0;
    const abcResult = list.map((item: any) => {
      runningSum += item.total_nilai;
      const kumulatif_persen = grandTotalValue > 0 ? (runningSum / grandTotalValue) * 100 : 0;
      
      let klasifikasi = 'C';
      if (kumulatif_persen <= 80) {
        klasifikasi = 'A';
      } else if (kumulatif_persen <= 95) {
        klasifikasi = 'B';
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
      const sumConsumed = validForAvg.reduce((sum, r) => sum + r.pemakaian, 0);
      const proyeksi_demand = validForAvg.length > 0 ? Math.round(sumConsumed / validForAvg.length) : 50;

      // Safety stock formula
      const leadTimeMultiplier = (medicine.lead_time_hari || 2) / 30;
      const safety_stock = Math.round(proyeksi_demand * leadTimeMultiplier * 1.5) || 5;
      const reorder_qty = proyeksi_demand + safety_stock;

      if (current_stock < reorder_qty) {
        lowStockAlerts.push({
          id: medicine.id,
          kode_obat: medicine.kode_obat,
          nama_obat: medicine.nama_obat,
          current_stock,
          reorder_qty,
          proyeksi_demand,
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
  try {
    const list = await db.query('SELECT id, nama, email, role, created_at FROM users');
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { nama, email, password, role } = req.body;
  if (!nama || !email || !password || !role) {
    return res.status(400).json({ message: 'Input pendaftaran akun tidak lengkap.' });
  }
  try {
    const rounds = 10;
    const password_hash = await bcrypt.hash(password, rounds);
    await db.query(
      'INSERT INTO users (nama, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [nama, email, password_hash, role]
    );
    res.json({ success: true, message: 'Akun petugas baru berhasil ditambahkan.' });
  } catch (err: any) {
    res.status(500).json({ message: `Gagal mendaftarkan akun: ${err.message}` });
  }
});

app.put('/api/admin/users/:id', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nama, email, role } = req.body;
  try {
    await db.query(
      'UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?',
      [nama, email, role, Number(id)]
    );
    res.json({ success: true, message: 'Akun berhasil diperbarui.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, roleGuard(['admin']), async (req: any, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
  }
  try {
    await db.query('DELETE FROM users WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/admin/reset-password', authenticateToken, roleGuard(['admin']), async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) {
    return res.status(400).json({ message: 'User id dan password baru wajib diisi.' });
  }
  try {
    const rounds = 10;
    const password_hash = await bcrypt.hash(newPassword, rounds);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, Number(userId)]);
    res.json({ success: true, message: 'Password user berhasil di-reset.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});


/* ==================== 7. EXCEL REPORT EXPORTS ==================== */

// Export Laboratory records to spreadsheet
app.get('/api/lab/export', authenticateToken, roleGuard(['admin']), async (req, res) => {
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
