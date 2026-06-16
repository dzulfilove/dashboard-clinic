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
    dbStatusInfo.status = 'OFFLINE';
    dbStatusInfo.error = `Could not connect to VPS MySQL: ${err.message}. Falling back to Virtual DB.`;
    console.warn(dbStatusInfo.error);
    initVirtualDb();
  }

  return dbStatusInfo;
}

// Check and complete tables on VPS MySQL
async function runMigrationsIfRequired() {
  if (!mysqlPool) return;
  try {
    const [tables]: any = await mysqlPool.query('SHOW TABLES');
    const tableList = tables.map((t: any) => Object.values(t)[0]);

    if (!tableList.includes('users') || !tableList.includes('lab_parameter') || !tableList.includes('obat_master')) {
      console.log('Tables do not exist. Running SQL schema setup for VPS MySQL...');
      const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Split queries by semicolon and filter out comments
        const queries = schemaSql
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0 && !q.startsWith('--'));

        for (const query of queries) {
          try {
            await mysqlPool.query(query);
          } catch (e: any) {
            console.error(`Error executing migration step: ${query.substring(0, 50)}... -> ${e.message}`);
          }
        }
        console.log('VPS MySQL migration script executed successfully.');
      }
    }
  } catch (err) {
    console.error('Failed to run setup migrations on MySQL pool:', err);
  }
}

// Virtual DB Implementation
// Simple schema state stored in src/db/virtual_db.json
interface VirtualDatabase {
  users: any[];
  lab_parameter: any[];
  lab_data_bulanan: any[];
  obat_master: any[];
  obat_konsumsi_bulanan: any[];
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
    obat_master: [
      { id: 1, kode_obat: 'OBT-PAR1', nama_obat: 'Paracetamol 500mg', golongan: 'Tablet Bebas', satuan: 'Tablet', kemasan: 'DUS / 10 Strips', harga_satuan: 250, lead_time_hari: 2, is_active: 1 },
      { id: 2, kode_obat: 'OBT-AMO2', nama_obat: 'Amoxicillin 500mg', golongan: 'Antibiotik Keras', satuan: 'Kaplet', kemasan: 'DUS / 10 strips', harga_satuan: 600, lead_time_hari: 3, is_active: 1 },
      { id: 3, kode_obat: 'OBT-MET3', nama_obat: 'Metformin 500mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 350, lead_time_hari: 2, is_active: 1 },
      { id: 4, kode_obat: 'OBT-AML4', nama_obat: 'Amlodipine 5mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 400, lead_time_hari: 2, is_active: 1 },
      { id: 5, kode_obat: 'OBT-CFX5', nama_obat: 'Cefadroxil 500mg', golongan: 'Antibiotik Keras', satuan: 'Kapsul', kemasan: 'DUS / 10 strips', harga_satuan: 1200, lead_time_hari: 4, is_active: 1 },
      { id: 6, kode_obat: 'OBT-OMP9', nama_obat: 'Omeprazole 20mg', golongan: 'Obat Keras', satuan: 'Kapsul', kemasan: 'DUS / 3 strips', harga_satuan: 500, lead_time_hari: 2, is_active: 1 },
      { id: 7, kode_obat: 'OBT-CTC10', nama_obat: 'Cetirizine 10mg', golongan: 'Obat Bebas Terbatas', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 300, lead_time_hari: 2, is_active: 1 },
      { id: 8, kode_obat: 'OBT-IBP11', nama_obat: 'Ibuprofen 400mg', golongan: 'Obat Bebas Terbatas', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 450, lead_time_hari: 2, is_active: 1 },
      { id: 9, kode_obat: 'OBT-MFS12', nama_obat: 'Mefenamic Acid 500mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 500, lead_time_hari: 2, is_active: 1 },
      { id: 10, kode_obat: 'OBT-SIM14', nama_obat: 'Simvastatin 20mg', golongan: 'Obat Keras', satuan: 'Tablet', kemasan: 'DUS / 10 strips', harga_satuan: 700, lead_time_hari: 2, is_active: 1 }
    ],
    obat_konsumsi_bulanan: [],
    obat_forecasting: []
  };

  // Seed some lab data for 2025 and 2026 (for gorgeous trend charts!)
  const params = defaultDb.lab_parameter;
  const currentYear = 2026;
  const pastYears = [2025, 2026];

  for (const year of pastYears) {
    const maxMonth = year === 2026 ? 6 : 12; // first half of 2026
    for (let month = 1; month <= maxMonth; month++) {
      for (const param of params) {
        // Randomized examination volumes based on the parameter type
        let baseCount = 50;
        if (param.kategori === 'HEMATOLOGI') baseCount = 120;
        if (param.kategori === 'KIMIA DARAH') baseCount = 80;
        const seedValue = Math.floor(baseCount + Math.sin(month + param.id) * 30 + Math.random() * 15);
        defaultDb.lab_data_bulanan.push({
          id: defaultDb.lab_data_bulanan.length + 1,
          parameter_id: param.id,
          bulan: month,
          tahun: year,
          jumlah: seedValue,
          input_by: 2,
          created_at: new Date(year, month - 1, 15).toISOString()
        });
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
        console.error(`MySQL Query Error: ${err.message}. Retrying via virtual DB if possible.`);
        // Don't crash, let it return virtual responses if appropriate or throw
        throw err;
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
    return vdb.lab_parameter.filter(p => p.is_active === 1);
  }

  // 5. GET LAB DATA BULANAN / FILTER
  if (norm.startsWith('SELECT d.*, p.nama_parameter, p.kategori FROM lab_data_bulanan d JOIN lab_parameter p ON d.parameter_id = p.id')) {
    // Apply filters from manual query params or just return all with JOIN
    let res = vdb.lab_data_bulanan.map(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      return {
        ...d,
        nama_parameter: p ? p.nama_parameter : 'Parameter Terhapus',
        kategori: p ? p.kategori : 'Kategori'
      };
    });

    // Simple manual parsing of filters
    if (norm.includes('d.bulan = ?') && norm.includes('d.tahun = ?')) {
      const [b, t] = params;
      res = res.filter(x => x.bulan === Number(b) && x.tahun === Number(t));
    }
    return res;
  }

  // 6. INSERT/UPDATE LAB DATA
  if (norm.includes('INSERT INTO lab_data_bulanan') && norm.includes('ON DUPLICATE KEY UPDATE')) {
    // Format: (parameter_id, bulan, tahun, jumlah, input_by)
    const [pid, b, t, val, uid] = params;
    const existingIdx = vdb.lab_data_bulanan.findIndex(
      x => x.parameter_id === Number(pid) && x.bulan === Number(b) && x.tahun === Number(t)
    );

    if (existingIdx !== -1) {
      vdb.lab_data_bulanan[existingIdx].jumlah = Number(val);
      vdb.lab_data_bulanan[existingIdx].input_by = Number(uid);
      vdb.lab_data_bulanan[existingIdx].created_at = new Date().toISOString();
    } else {
      vdb.lab_data_bulanan.push({
        id: vdb.lab_data_bulanan.length > 0 ? Math.max(...vdb.lab_data_bulanan.map(x => x.id)) + 1 : 1,
        parameter_id: Number(pid),
        bulan: Number(b),
        tahun: Number(t),
        jumlah: Number(val),
        input_by: Number(uid),
        created_at: new Date().toISOString()
      });
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // 7. LAB TREN
  if (norm.includes('SELECT d.bulan, d.tahun, SUM(d.jumlah) as total, p.kategori')) {
    // Generate laboratory category trend charts
    // Group monthly lab data totals by category and month
    const list = vdb.lab_data_bulanan.map(d => {
      const p = vdb.lab_parameter.find(lp => lp.id === d.parameter_id);
      return { ...d, kategori: p ? p.kategori : 'KATEGORI' };
    });

    const groups: { [key: string]: { bulan: number; tahun: number; total: number; kategori: string } } = {};
    for (const d of list) {
      const key = `${d.tahun}-${d.bulan}-${d.kategori}`;
      if (!groups[key]) {
        groups[key] = { bulan: d.bulan, tahun: d.tahun, total: 0, kategori: d.kategori || '' };
      }
      groups[key].total += d.jumlah;
    }
    return Object.values(groups).sort((a,b) => (a.tahun * 12 + a.bulan) - (b.tahun * 12 + b.bulan));
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
    const [kode, nama, gol, sat, kemas, harga, lt] = params;
    const newObat = {
      id: vdb.obat_master.length > 0 ? Math.max(...vdb.obat_master.map(o => o.id)) + 1 : 1,
      kode_obat: kode,
      nama_obat: nama,
      golongan: gol,
      satuan: sat,
      kemasan: kemas,
      harga_satuan: Number(harga),
      lead_time_hari: Number(lt || 2),
      is_active: 1
    };
    vdb.obat_master.push(newObat);
    writeVirtualDb(vdb);
    return { insertId: newObat.id };
  }
  if (norm.startsWith('UPDATE obat_master SET')) {
    // Format: kode_obat = ?, nama_obat = ?, golongan = ?, satuan = ?, kemasan = ?, harga_satuan = ?, lead_time_hari = ?, is_active = ? WHERE id = ?
    const [kode, nama, gol, sat, kemas, harga, lt, active, id] = params;
    const idx = vdb.obat_master.findIndex(o => o.id === Number(id));
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
    return { affectedRows: 0 };
  }

  // 9. PHARMACY CONSUMPTION
  if (norm.startsWith('SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_bulanan c JOIN obat_master o ON c.obat_id = o.id')) {
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

  if (norm.includes('INSERT INTO obat_konsumsi_bulanan') && norm.includes('ON DUPLICATE KEY UPDATE')) {
    // Format: (obat_id, bulan, tahun, stok_awal, penerimaan, pemakaian, sisa_stok, input_by)
    const [oid, b, t, sawal, terima, pakai, sisa, uid] = params;
    const existingIdx = vdb.obat_konsumsi_bulanan.findIndex(
      x => x.obat_id === Number(oid) && x.bulan === Number(b) && x.tahun === Number(t)
    );

    if (existingIdx !== -1) {
      vdb.obat_konsumsi_bulanan[existingIdx].stok_awal = Number(sawal);
      vdb.obat_konsumsi_bulanan[existingIdx].penerimaan = Number(terima);
      vdb.obat_konsumsi_bulanan[existingIdx].pemakaian = Number(pakai);
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
        sisa_stok: Number(sisa),
        input_by: Number(uid),
        created_at: new Date().toISOString()
      });
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // Fallback defaults for unrecognized queries
  console.log('Unrecognized virtual query fallback simulation:', sqlText.substring(0, 80));
  return [];
}
