import fs from 'fs';
import path from 'path';
import mysql, { Pool } from 'mysql2/promise';

const VIRTUAL_DB_FILE = path.join(process.cwd(), 'src', 'db', 'virtual_db.json');

// Interface for DB Diagnostic Status
export interface DbStatus {
  isVirtual: boolean;
  host: string;
  database: string;
  user: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'VIRTUAL';
  error: string | null;
}

let mysqlPool: Pool | null = null;
let dbStatusInfo: DbStatus = {
  isVirtual: true,
  host: '',
  database: '',
  user: '',
  port: 3306,
  status: 'VIRTUAL',
  error: null,
};

// Check env elements to determine if we should look for MySQL
function hasMySqlEnv(): boolean {
  return !!(
    process.env.DB_HOST ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_DATABASE
  );
}

// Initialize MySQL pool if available
export async function initializeDatabase(): Promise<DbStatus> {
  const host = process.env.DB_HOST || '';
  const user = process.env.DB_USER || '';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_DATABASE || process.env.DB_NAME || '';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  dbStatusInfo = {
    isVirtual: true,
    host,
    database,
    user,
    port,
    status: 'VIRTUAL',
    error: null,
  };

  if (!hasMySqlEnv()) {
    dbStatusInfo.error = 'MySQL env variables are not defined. Operating in Virtual DB mode.';
    initVirtualDb();
    return dbStatusInfo;
  }

  try {
    // Attempt standard connection
    const testPool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 5000, // 5s timeout
    });

    // Test query
    await testPool.query('SELECT 1');
    mysqlPool = testPool;
    dbStatusInfo.isVirtual = false;
    dbStatusInfo.status = 'ONLINE';
    dbStatusInfo.error = null;
    console.log(`Successfully connected to VPS MySQL at ${host}:${port}`);

    // Automatically check and run initial tables creation
    await runMigrationsIfRequired();

  } catch (err: any) {
    dbStatusInfo.isVirtual = true; // Safe fallback to virtual DB so app does not crash
    dbStatusInfo.status = 'OFFLINE';
    dbStatusInfo.error = `Could not connect or migrate VPS MySQL: ${err.message}. Falling back to Virtual DB.`;
    console.warn(dbStatusInfo.error);
    initVirtualDb();
  }

  return dbStatusInfo;
}

// Check and complete tables on VPS MySQL
export async function runMigrationScript(options: { cleanReset?: boolean } = {}): Promise<{ success: boolean; message: string }> {
  if (!mysqlPool) {
    throw new Error('Koneksi pool MySQL belum diinisialisasi.');
  }

  const connection = await mysqlPool.getConnection();
  try {
    // 1. Disable foreign key checks to prevent Lock-Ins/order conflicts during DDL creation
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // 2. Dropping existing tables if cleanReset is enabled
    if (options.cleanReset) {
      console.log('Clean reset: Menghapus tabel lama yang berkonflik...');
      const drops = [
        'DROP TABLE IF EXISTS obat_forecasting',
        'DROP TABLE IF EXISTS obat_konsumsi_harian',
        'DROP TABLE IF EXISTS obat_konsumsi_bulanan',
        'DROP TABLE IF EXISTS lab_data_harian',
        'DROP TABLE IF EXISTS lab_data_bulanan',
        'DROP TABLE IF EXISTS obat_master',
        'DROP TABLE IF EXISTS lab_parameter',
        'DROP TABLE IF EXISTS users'
      ];
      for (const d of drops) {
        await connection.query(d);
      }
    }

    // 3. Read and execute file queries on the same connection session
    const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('File schema.sql tidak ditemukan.');
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const queries = schemaSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    for (const query of queries) {
      await connection.query(query);
    }

    // 4. Re-enable foreign key checks at the end of execution
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    return { success: true, message: 'Migrasi database dan seeding data selesai sukses!' };
  } catch (err: any) {
    // Safely re-enable foreign key constraints if they failed mid-process
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch {}
    console.error('Detail kesalahan migrasi database:', err);
    throw err;
  } finally {
    connection.release();
  }
}

async function runMigrationsIfRequired() {
  if (!mysqlPool) return;
  try {
    const [tables]: any = await mysqlPool.query('SHOW TABLES');
    const tableList = tables.map((t: any) => Object.values(t)[0]);

    if (!tableList.includes('lab_parameter') || !tableList.includes('obat_master') || !tableList.includes('lab_data_harian') || !tableList.includes('obat_konsumsi_harian')) {
      console.log('Tables do not exist. Automatically running safe migrator on startup...');
      await runMigrationScript({ cleanReset: false });
    } else {
      // Tables exist, check if columns need to be added
      try {
        const [cols]: any = await mysqlPool.query("SHOW COLUMNS FROM obat_master LIKE 'safety_stock'");
        if (cols.length === 0) {
          console.log('Adding columns safety_stock, stok_minimum, reorder_point to existing obat_master MySQL table...');
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN safety_stock INT DEFAULT 0 AFTER lead_time_hari");
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN stok_minimum INT DEFAULT 0 AFTER safety_stock");
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN reorder_point INT DEFAULT 0 AFTER stok_minimum");
          console.log('Columns added successfully.');
        }
      } catch (colErr: any) {
        console.error('Failed checking columns on existing obat_master:', colErr.message);
      }
    }
  } catch (err) {
    console.error('Failed to run automatic startup migrations:', err);
  }
}

// Virtual DB Implementation
// Simple schema state stored in src/db/virtual_db.json
interface VirtualDatabase {
  users: any[];
  lab_parameter: any[];
  lab_data_bulanan: any[];
  lab_data_harian?: any[];
  obat_master: any[];
  obat_konsumsi_bulanan: any[];
  obat_konsumsi_harian?: any[];
  obat_forecasting: any[];
}

function initVirtualDb() {
  const dir = path.dirname(VIRTUAL_DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(VIRTUAL_DB_FILE)) {
    return; // Already initialized
  }

  // Populate Seed Data
  const defaultDb: VirtualDatabase = {
    users: [
      {
        id: 1,
        nama: 'Administrator Puri Medika',
        email: 'admin@clinic.com',
        // password is: admin123 (hashed with bcrypt or we support direct comparing)
        password_hash: '$2a$10$iI0T7XF7vDbe.n89eWw6ZuoVb1AAnqJ8.8VzKxU1Hw6WzN48rQ44q',
        role: 'admin',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        nama: 'Petugas Laboratorium',
        email: 'lab@clinic.com',
        // password is: lab123
        password_hash: '$2a$10$o6mOnS4eHhB2Yf80W2Ie8OfKmsidb4.aZ3Q1zP8zPvx/1z.q8V8u2',
        role: 'lab',
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        nama: 'Apoteker Farmasi',
        email: 'farmasi@clinic.com',
        // password is: farmasi123
        password_hash: '$2a$10$MscvHox6K3G4WjJjM.sEAu.KIn1nZt.Y5C0p2I9CDeF0p3sI4Gz2a',
        role: 'farmasi',
        created_at: new Date().toISOString()
      }
    ],
    lab_parameter: [
      { id: 1, kategori: 'HEMATOLOGI', nama_parameter: 'Hemoglobin (Hb)', is_active: 1 },
      { id: 2, kategori: 'HEMATOLOGI', nama_parameter: 'Leukosit', is_active: 1 },
      { id: 3, kategori: 'HEMATOLOGI', nama_parameter: 'Trombosit', is_active: 1 },
      { id: 4, kategori: 'HEMATOLOGI', nama_parameter: 'Eritrosit', is_active: 1 },
      { id: 5, kategori: 'KIMIA DARAH', nama_parameter: 'Glukosa Sewaktu', is_active: 1 },
      { id: 6, kategori: 'KIMIA DARAH', nama_parameter: 'Kolesterol Total', is_active: 1 },
      { id: 7, kategori: 'KIMIA DARAH', nama_parameter: 'Asam Urat', is_active: 1 },
      { id: 8, kategori: 'KIMIA DARAH', nama_parameter: 'Ureum', is_active: 1 },
      { id: 9, kategori: 'KIMIA DARAH', nama_parameter: 'Kreatinin', is_active: 1 },
      { id: 10, kategori: 'IMUNOSEROLOGI', nama_parameter: 'Widal', is_active: 1 },
      { id: 11, kategori: 'IMUNOSEROLOGI', nama_parameter: 'HBsAg', is_active: 1 },
      { id: 12, kategori: 'URINALISIS', nama_parameter: 'Urin Lengkap', is_active: 1 }
    ],
    lab_data_bulanan: [],
    lab_data_harian: [],
    obat_master: [
      { id: 1, kode_obat: 'OBT-PAR1', nama_obat: 'Paracetamol 500mg', golongan: 'Tablet Bebas', satuan: 'Tablet', kemasan: 'DUS / 10 Strips', harga_satuan: 250, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 2, kode_obat: 'OBT-AMO2', nama_obat: 'Amoxicillin 500mg', golongan: 'Antibiotik Keras', satuan: 'Kaplet', kemasan: 'DUS / 10 strips', harga_satuan: 600, lead_time_hari: 3, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 3, kode_obat: 'OBT-MET3', nama_obat: 'Metformin 500mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 350, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 4, kode_obat: 'OBT-AML4', nama_obat: 'Amlodipine 5mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 400, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 5, kode_obat: 'OBT-CFX5', nama_obat: 'Cefadroxil 500mg', golongan: 'Antibiotik Keras', satuan: 'Kapsul', kemasan: 'DUS / 10 strips', harga_satuan: 1200, lead_time_hari: 4, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 6, kode_obat: 'OBT-OMP9', nama_obat: 'Omeprazole 20mg', golongan: 'Obat Keras', satuan: 'Kapsul', kemasan: 'DUS / 3 strips', harga_satuan: 500, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 7, kode_obat: 'OBT-CTC10', nama_obat: 'Cetirizine 10mg', golongan: 'Obat Bebas Terbatas', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 300, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 8, kode_obat: 'OBT-IBP11', nama_obat: 'Ibuprofen 400mg', golongan: 'Obat Bebas Terbatas', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 450, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 9, kode_obat: 'OBT-MFS12', nama_obat: 'Mefenamic Acid 500mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 500, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 },
      { id: 10, kode_obat: 'OBT-SIM14', nama_obat: 'Simvastatin 20mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 700, lead_time_hari: 2, is_active: 1, safety_stock: 0, stok_minimum: 0, reorder_point: 0 }
    ],
    obat_konsumsi_bulanan: [],
    obat_konsumsi_harian: [],
    obat_forecasting: []
  };

  // Seed daily lab data for 2025 and 2026 (for gorgeous trend charts!)
  const params = defaultDb.lab_parameter;
  const pastYears = [2025, 2026];

  for (const year of pastYears) {
    const maxMonth = year === 2026 ? 6 : 12; // first half of 2026
    for (let month = 1; month <= maxMonth; month++) {
      // Seed data for 4 audit checkpoints in each month (days: 5, 12, 18, 25)
      const seedDays = [5, 12, 18, 25];
      for (const day of seedDays) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        for (const param of params) {
          let baseCount = 12;
          if (param.kategori === 'HEMATOLOGI') baseCount = 30;
          if (param.kategori === 'KIMIA DARAH') baseCount = 20;
          const seedValue = Math.floor(baseCount + Math.sin(month + day + param.id) * 8 + Math.random() * 4);
          defaultDb.lab_data_harian!.push({
            id: defaultDb.lab_data_harian!.length + 1,
            parameter_id: param.id,
            tanggal: dateStr,
            jumlah: seedValue,
            input_by: 2,
            created_at: new Date(year, month - 1, day).toISOString()
          });
        }
      }
    }
  }

  // Seed medicine consumption logs for moving average calculation (3 months back)
  const medicines = defaultDb.obat_master;
  for (const year of pastYears) {
    const maxMonth = year === 2026 ? 6 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      for (const obat of medicines) {
        // Create matching stock logs
        let baseCons = 100;
        if (obat.id === 1) baseCons = 350; // Paracetamol high
        if (obat.id === 2) baseCons = 220; // Amoxicillin high
        if (obat.id === 3) baseCons = 140;

        const consumed = Math.floor(baseCons + Math.sin(month * 1.5 + obat.id) * 40 + Math.random() * 20);
        const received = Math.floor(consumed * 1.1 + Math.random() * 10);
        const startStock = Math.floor(baseCons * 1.5 + Math.random() * 50);
        const sisa = startStock + received - consumed;

        defaultDb.obat_konsumsi_bulanan.push({
          id: defaultDb.obat_konsumsi_bulanan.length + 1,
          obat_id: obat.id,
          bulan: month,
          tahun: year,
          stok_awal: startStock,
          penerimaan: received,
          pemakaian: consumed,
          retur_hilang: 0,
          sisa_stok: sisa,
          input_by: 3,
          created_at: new Date(year, month - 1, 20).toISOString()
        });
      }
    }
  }

  fs.writeFileSync(VIRTUAL_DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
}

// Read database contents
export function readVirtualDb(): VirtualDatabase {
  if (!fs.existsSync(VIRTUAL_DB_FILE)) {
    initVirtualDb();
  }
  return JSON.parse(fs.readFileSync(VIRTUAL_DB_FILE, 'utf8'));
}

// Write database contents
export function writeVirtualDb(data: VirtualDatabase) {
  fs.writeFileSync(VIRTUAL_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Database helper functions wrapped as a unified Query Interface
export const db = {
  getDiagnosticStatus: () => dbStatusInfo,

  setDiagnosticStatus: (info: Partial<DbStatus>) => {
    dbStatusInfo = { ...dbStatusInfo, ...info };
  },

  // Perform a generic query. If in virtual mode, executes Javascript simulator logic.
  query: async (sqlText: string, params: any[] = []): Promise<any> => {
    if (!dbStatusInfo.isVirtual && mysqlPool) {
      try {
        const [results] = await mysqlPool.query(sqlText, params);
        return results;
      } catch (err: any) {
        console.error(`MySQL Query Error: ${err.message}. Cascading fallback to Virtual DB for this query.`);
        // Fall through to simulated query so the frontend does not crash
      }
    }

    // VIRTUAL JS DATABASE SIMULATION
    return simulateSqlQuery(sqlText, params);
  }
};

// SQL query parser/simulator for critical features
function simulateSqlQuery(sqlText: string, params: any[]): any {
  const norm = sqlText.replace(/\s+/g, ' ').trim();
  const vdb = readVirtualDb();

  // 1. SELECT USERS
  if (norm.startsWith('SELECT * FROM users WHERE email = ?')) {
    const email = params[0]?.toLowerCase();
    const user = vdb.users.find(u => u.email.toLowerCase() === email);
    return user ? [user] : [];
  }
  if (norm.startsWith('SELECT * FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    const user = vdb.users.find(u => u.id === id);
    return user ? [user] : [];
  }
  if (norm.startsWith('SELECT * FROM users') || norm.startsWith('SELECT id, nama, email, role, created_at FROM users')) {
    return vdb.users;
  }

  // 2. INSERT USER
  if (norm.startsWith('INSERT INTO users')) {
    const [nama, email, password_hash, role] = params;
    const existing = vdb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error(`Email ${email} sudah terdaftar.`);
    }
    const newUser = {
      id: vdb.users.length > 0 ? Math.max(...vdb.users.map(u => u.id)) + 1 : 1,
      nama,
      email,
      password_hash,
      role,
      created_at: new Date().toISOString()
    };
    vdb.users.push(newUser);
    writeVirtualDb(vdb);
    return { insertId: newUser.id };
  }

  // 3. UPDATE USER / PASSWORD RESET
  if (norm.startsWith('UPDATE users SET password_hash = ? WHERE id = ?')) {
    const [pwd, id] = params;
    const uIdx = vdb.users.findIndex(u => u.id === Number(id));
    if (uIdx !== -1) {
      vdb.users[uIdx].password_hash = pwd;
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }
  if (norm.startsWith('UPDATE users SET nama = ?, email = ?, role = ? WHERE id = ?')) {
    const [nama, email, role, id] = params;
    const uIdx = vdb.users.findIndex(u => u.id === Number(id));
    if (uIdx !== -1) {
      vdb.users[uIdx].nama = nama;
      vdb.users[uIdx].email = email;
      vdb.users[uIdx].role = role;
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }
  if (norm.startsWith('DELETE FROM users WHERE id = ?')) {
    const id = Number(params[0]);
    vdb.users = vdb.users.filter(u => u.id !== id);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // 4. LAB PARAMETER
  if (norm.startsWith('SELECT * FROM lab_parameter WHERE is_active = 1') || norm.startsWith('SELECT * FROM lab_parameter')) {
    let list = vdb.lab_parameter;
    if (norm.includes('WHERE is_active = 1')) {
      list = list.filter(p => p.is_active === 1);
    }
    return list.sort((a, b) => {
      const catComp = (a.kategori || '').localeCompare(b.kategori || '');
      if (catComp !== 0) return catComp;
      return (a.nama_parameter || '').localeCompare(b.nama_parameter || '');
    });
  }

  if (norm.startsWith('INSERT INTO lab_parameter')) {
    const [kategori, nama, active] = params;
    const newP = {
      id: vdb.lab_parameter.length > 0 ? Math.max(...vdb.lab_parameter.map(p => p.id)) + 1 : 1,
      kategori: String(kategori).toUpperCase().trim(),
      nama_parameter: String(nama).trim(),
      is_active: active !== undefined ? Number(active) : 1
    };
    vdb.lab_parameter.push(newP);
    writeVirtualDb(vdb);
    return { insertId: newP.id };
  }

  if (norm.startsWith('UPDATE lab_parameter SET')) {
    // Format: kategori = ?, nama_parameter = ?, is_active = ? WHERE id = ?
    const [kategori, nama, active, id] = params;
    const idx = vdb.lab_parameter.findIndex(p => p.id === Number(id));
    if (idx !== -1) {
      vdb.lab_parameter[idx].kategori = String(kategori).toUpperCase().trim();
      vdb.lab_parameter[idx].nama_parameter = String(nama).trim();
      vdb.lab_parameter[idx].is_active = Number(active);
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // 5. GET LAB DATA HARIAN / FILTER / MONTHLY AGGREGATE
  if (norm.startsWith('SELECT d.*, p.nama_parameter, p.kategori FROM lab_data_harian d JOIN lab_parameter p ON d.parameter_id = p.id')) {
    let res = (vdb.lab_data_harian || []).map(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      return {
        ...d,
        nama_parameter: p ? p.nama_parameter : 'Parameter Terhapus',
        kategori: p ? p.kategori : 'Kategori'
      };
    });

    if (norm.includes('d.tanggal = ?')) {
      const t = params[0];
      res = res.filter(x => x.tanggal === t);
    }
    return res;
  }

  if (norm.includes('SELECT SUM(d.jumlah) as jumlah, d.parameter_id, p.nama_parameter, p.kategori FROM lab_data_harian d')) {
    // This is the monthly breakdown query
    // MONTH(d.tanggal) = ? AND YEAR(d.tanggal) = ?
    const [b, t] = params;
    
    // Filter by month & year
    const filtered = (vdb.lab_data_harian || []).filter(d => {
      const dateObj = new Date(d.tanggal);
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      return m === Number(b) && y === Number(t);
    });

    // Group by parameter_id
    const groups: { [key: number]: any } = {};
    filtered.forEach(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      if (!p) return;
      if (!groups[d.parameter_id]) {
        groups[d.parameter_id] = {
          jumlah: 0,
          parameter_id: d.parameter_id,
          nama_parameter: p.nama_parameter,
          kategori: p.kategori
        };
      }
      groups[d.parameter_id].jumlah += d.jumlah;
    });

    return Object.values(groups);
  }

  // 6. INSERT/UPDATE LAB DATA HARIAN
  if (norm.includes('INSERT INTO lab_data_harian') && norm.includes('ON DUPLICATE KEY UPDATE')) {
    // Format: (parameter_id, tanggal, jumlah, input_by)
    const [pid, tString, val, uid] = params;
    if (!vdb.lab_data_harian) {
      vdb.lab_data_harian = [];
    }
    const existingIdx = vdb.lab_data_harian.findIndex(
      x => x.parameter_id === Number(pid) && x.tanggal === String(tString)
    );

    if (existingIdx !== -1) {
      vdb.lab_data_harian[existingIdx].jumlah = Number(val);
      vdb.lab_data_harian[existingIdx].input_by = Number(uid);
      vdb.lab_data_harian[existingIdx].created_at = new Date().toISOString();
    } else {
      vdb.lab_data_harian.push({
        id: vdb.lab_data_harian.length > 0 ? Math.max(...vdb.lab_data_harian.map(x => x.id)) + 1 : 1,
        parameter_id: Number(pid),
        tanggal: String(tString),
        jumlah: Number(val),
        input_by: Number(uid),
        created_at: new Date().toISOString()
      });
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // 7. LAB REKAP AND TREN HARIAN
  if (norm.includes('SELECT p.kategori, SUM(d.jumlah) as total FROM lab_data_harian d')) {
    // Rekap harian
    const [b, t] = params;
    const filtered = (vdb.lab_data_harian || []).filter(d => {
      const dateObj = new Date(d.tanggal);
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      return m === Number(b) && y === Number(t);
    });

    const groups: { [key: string]: number } = {};
    filtered.forEach(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      if (!p) return;
      groups[p.kategori] = (groups[p.kategori] || 0) + d.jumlah;
    });

    return Object.entries(groups).map(([kategori, total]) => ({ kategori, total }));
  }

  if (norm.includes('SELECT MONTH(d.tanggal) as bulan, YEAR(d.tanggal) as tahun, SUM(d.jumlah) as total, p.kategori FROM lab_data_harian d')) {
    const groups: { [key: string]: { bulan: number; tahun: number; total: number; kategori: string } } = {};
    
    (vdb.lab_data_harian || []).forEach(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      if (!p) return;
      const dateObj = new Date(d.tanggal);
      const m = dateObj.getMonth() + 1;
      const y = dateObj.getFullYear();
      const key = `${y}-${m}-${p.kategori}`;
      
      if (!groups[key]) {
        groups[key] = { bulan: m, tahun: y, total: 0, kategori: p.kategori };
      }
      groups[key].total += d.jumlah;
    });

    return Object.values(groups).sort((a, b) => (a.tahun * 12 + a.bulan) - (b.tahun * 12 + b.bulan));
  }

  // 8. OBAT MASTER
  if (norm.startsWith('SELECT * FROM obat_master WHERE is_active = 1') || norm.startsWith('SELECT * FROM obat_master')) {
    const q = params[0] || '';
    let res = vdb.obat_master;
    if (q) {
      const qLower = String(q).toLowerCase();
      res = res.filter(o => o.nama_obat.toLowerCase().includes(qLower) || o.kode_obat.toLowerCase().includes(qLower));
    }
    return res;
  }
  if (norm.startsWith('INSERT INTO obat_master')) {
    let kode, nama, gol, sat, kemas, harga, lt, ss = 0, smin = 0, rp = 0;
    if (params.length >= 10) {
      [kode, nama, gol, sat, kemas, harga, lt, ss, smin, rp] = params;
    } else {
      [kode, nama, gol, sat, kemas, harga, lt] = params;
    }

    const newObat = {
      id: vdb.obat_master.length > 0 ? Math.max(...vdb.obat_master.map(o => o.id)) + 1 : 1,
      kode_obat: kode,
      nama_obat: nama,
      golongan: gol || 'Obat Bebas',
      satuan: sat || 'Tablet',
      kemasan: kemas || 'Box',
      harga_satuan: Number(harga || 0),
      lead_time_hari: Number(lt || 2),
      safety_stock: Number(ss || 0),
      stok_minimum: Number(smin || 0),
      reorder_point: Number(rp || 0),
      is_active: 1
    };

    const exIdx = vdb.obat_master.findIndex(o => String(o.kode_obat).toLowerCase() === String(kode).toLowerCase());
    if (exIdx !== -1) {
      vdb.obat_master[exIdx] = {
        ...vdb.obat_master[exIdx],
        ...newObat,
        id: vdb.obat_master[exIdx].id,
        is_active: 1
      };
      writeVirtualDb(vdb);
      return { insertId: vdb.obat_master[exIdx].id, affectedRows: 1 };
    } else {
      vdb.obat_master.push(newObat);
      writeVirtualDb(vdb);
      return { insertId: newObat.id, affectedRows: 1 };
    }
  }
  if (norm.startsWith('UPDATE obat_master SET')) {
    let idx = -1;
    if (params.length >= 11) {
      const [kode, nama, gol, sat, kemas, harga, lt, ss, smin, rp, active, id] = params;
      idx = vdb.obat_master.findIndex(o => o.id === Number(id));
      if (idx !== -1) {
        vdb.obat_master[idx] = {
          ...vdb.obat_master[idx],
          kode_obat: kode,
          nama_obat: nama,
          golongan: gol,
          satuan: sat,
          kemasan: kemas,
          harga_satuan: Number(harga),
          lead_time_hari: Number(lt),
          safety_stock: Number(ss),
          stok_minimum: Number(smin),
          reorder_point: Number(rp),
          is_active: Number(active)
        };
        writeVirtualDb(vdb);
        return { affectedRows: 1 };
      }
    } else {
      const [kode, nama, gol, sat, kemas, harga, lt, active, id] = params;
      idx = vdb.obat_master.findIndex(o => o.id === Number(id));
      if (idx !== -1) {
        vdb.obat_master[idx] = {
          ...vdb.obat_master[idx],
          kode_obat: kode,
          nama_obat: nama,
          golongan: gol,
          satuan: sat,
          kemasan: kemas,
          harga_satuan: Number(harga),
          lead_time_hari: Number(lt),
          is_active: Number(active)
        };
        writeVirtualDb(vdb);
        return { affectedRows: 1 };
      }
    }
    return { affectedRows: 0 };
  }

  // 9. PHARMACY CONSUMPTION
  if (norm.startsWith('SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_bolanan c JOIN obat_master o ON c.obat_id = o.id') || norm.startsWith('SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_bulanan c JOIN obat_master o ON c.obat_id = o.id')) {
    let res = vdb.obat_konsumsi_bulanan.map(c => {
      const o = vdb.obat_master.find(m => m.id === c.obat_id);
      return {
        ...c,
        nama_obat: o ? o.nama_obat : 'Nama Obat',
        kode_obat: o ? o.kode_obat : 'KODE',
        harga_satuan: o ? Number(o.harga_satuan) : 0,
        lead_time_hari: o ? Number(o.lead_time_hari) : 2,
        golongan: o ? o.golongan : 'Golongan'
      };
    });

    if (norm.includes('c.bulan = ?') && norm.includes('c.tahun = ?')) {
      const [b, t] = params;
      res = res.filter(x => x.bulan === Number(b) && x.tahun === Number(t));
    }
    return res;
  }

  // 9.5 PHARMACY CONSUMPTION DAILY
  if (norm.startsWith('SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_harian c JOIN obat_master o ON c.obat_id = o.id')) {
    if (!vdb.obat_konsumsi_harian) vdb.obat_konsumsi_harian = [];
    let res = vdb.obat_konsumsi_harian.map(c => {
      const o = vdb.obat_master.find(m => m.id === c.obat_id);
      return {
        ...c,
        nama_obat: o ? o.nama_obat : 'Nama Obat',
        kode_obat: o ? o.kode_obat : 'KODE',
        harga_satuan: o ? Number(o.harga_satuan) : 0,
        lead_time_hari: o ? Number(o.lead_time_hari) : 2,
        golongan: o ? o.golongan : 'Golongan'
      };
    });

    if (norm.includes('c.tanggal = ?')) {
      const [t] = params;
      res = res.filter(x => x.tanggal === String(t));
    }
    return res;
  }

  if (norm.includes('INSERT INTO obat_konsumsi_harian') && norm.includes('ON DUPLICATE KEY UPDATE')) {
    // Format: (obat_id, tanggal, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) (8 params)
    const [oid, tVal, sawal, terima, pakai, retur, sisa, uid] = params;
    if (!vdb.obat_konsumsi_harian) vdb.obat_konsumsi_harian = [];
    
    const existingIdx = vdb.obat_konsumsi_harian.findIndex(
      x => x.obat_id === Number(oid) && x.tanggal === String(tVal)
    );

    if (existingIdx !== -1) {
      vdb.obat_konsumsi_harian[existingIdx].stok_awal = Number(sawal);
      vdb.obat_konsumsi_harian[existingIdx].penerimaan = Number(terima);
      vdb.obat_konsumsi_harian[existingIdx].pemakaian = Number(pakai);
      vdb.obat_konsumsi_harian[existingIdx].retur_hilang = Number(retur);
      vdb.obat_konsumsi_harian[existingIdx].sisa_stok = Number(sisa);
      vdb.obat_konsumsi_harian[existingIdx].input_by = Number(uid);
      vdb.obat_konsumsi_harian[existingIdx].created_at = new Date().toISOString();
    } else {
      vdb.obat_konsumsi_harian.push({
        id: vdb.obat_konsumsi_harian.length > 0 ? Math.max(...vdb.obat_konsumsi_harian.map(x => x.id)) + 1 : 1,
        obat_id: Number(oid),
        tanggal: String(tVal),
        stok_awal: Number(sawal),
        penerimaan: Number(terima),
        pemakaian: Number(pakai),
        retur_hilang: Number(retur),
        sisa_stok: Number(sisa),
        input_by: Number(uid),
        created_at: new Date().toISOString()
      });
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.includes('FROM obat_konsumsi_harian') && norm.includes('MONTH(tanggal) = ?') && norm.includes('YEAR(tanggal) = ?')) {
    const [oid, b, t] = params;
    if (!vdb.obat_konsumsi_harian) vdb.obat_konsumsi_harian = [];

    const filtered = vdb.obat_konsumsi_harian.filter(x => {
      const matchesObat = x.obat_id === Number(oid);
      const dObj = new Date(x.tanggal);
      const m = dObj.getMonth() + 1;
      const y = dObj.getFullYear();
      return matchesObat && m === Number(b) && y === Number(t);
    });

    // Sort by tanggal ASC
    filtered.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return filtered;
  }

  if (norm.includes('INSERT INTO obat_konsumsi_bulanan') && norm.includes('ON DUPLICATE KEY UPDATE')) {
    // Format: (obat_id, bulan, tahun, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) (9 params)
    // or fallback Format: (obat_id, bulan, tahun, stok_awal, penerimaan, pemakaian, sisa_stok, input_by) (8 params)
    let oid, b, t, sawal, terima, pakai, retur = 0, sisa, uid;
    if (params.length >= 9) {
      [oid, b, t, sawal, terima, pakai, retur, sisa, uid] = params;
    } else {
      [oid, b, t, sawal, terima, pakai, sisa, uid] = params;
    }

    const existingIdx = vdb.obat_konsumsi_bulanan.findIndex(
      x => x.obat_id === Number(oid) && x.bulan === Number(b) && x.tahun === Number(t)
    );

    if (existingIdx !== -1) {
      vdb.obat_konsumsi_bulanan[existingIdx].stok_awal = Number(sawal);
      vdb.obat_konsumsi_bulanan[existingIdx].penerimaan = Number(terima);
      vdb.obat_konsumsi_bulanan[existingIdx].pemakaian = Number(pakai);
      vdb.obat_konsumsi_bulanan[existingIdx].retur_hilang = Number(retur);
      vdb.obat_konsumsi_bulanan[existingIdx].sisa_stok = Number(sisa);
      vdb.obat_konsumsi_bulanan[existingIdx].input_by = Number(uid);
      vdb.obat_konsumsi_bulanan[existingIdx].created_at = new Date().toISOString();
    } else {
      vdb.obat_konsumsi_bulanan.push({
        id: vdb.obat_konsumsi_bulanan.length > 0 ? Math.max(...vdb.obat_konsumsi_bulanan.map(x => x.id)) + 1 : 1,
        obat_id: Number(oid),
        bulan: Number(b),
        tahun: Number(t),
        stok_awal: Number(sawal),
        penerimaan: Number(terima),
        pemakaian: Number(pakai),
        retur_hilang: Number(retur),
        sisa_stok: Number(sisa),
        input_by: Number(uid),
        created_at: new Date().toISOString()
      });
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // Forecast/ABC generic select from obat_konsumsi_bulanan
  if (norm.includes('FROM obat_konsumsi_bulanan') && norm.includes('pemakaian') && !norm.includes('JOIN')) {
    return vdb.obat_konsumsi_bulanan.map(c => ({
      obat_id: c.obat_id,
      bulan: c.bulan,
      tahun: c.tahun,
      pemakaian: c.pemakaian,
      retur_hilang: c.retur_hilang || 0,
      sisa_stok: c.sisa_stok
    }));
  }

  // Fallback defaults for unrecognized queries
  console.log('Unrecognized virtual query fallback simulation:', sqlText.substring(0, 80));
  return [];
}
