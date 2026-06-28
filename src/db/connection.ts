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
  console.log('DB_HOST:', host);
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

    // Automatically verify and run missing migrations if required
    await runMigrationsIfRequired();

  } catch (err: any) {
    dbStatusInfo.isVirtual = true; // Safe fallback to virtual DB so app does not crash
    dbStatusInfo.status = 'OFFLINE';
    dbStatusInfo.error = `Could not connect VPS MySQL: ${err.message}. Falling back to Virtual DB.`;
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
        'DROP TABLE IF EXISTS user_logs',
        'DROP TABLE IF EXISTS tindakan_rawat_jalan',
        'DROP TABLE IF EXISTS master_tindakan',
        'DROP TABLE IF EXISTS registrasi_rawat_jalan',
        'DROP TABLE IF EXISTS master_icd10',
        'DROP TABLE IF EXISTS pasien',
        'DROP TABLE IF EXISTS pelayanan_rawat_jalan_tindakan',
        'DROP TABLE IF EXISTS pelayanan_rawat_jalan',
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

    // EXTRA: Ensure lab_parameter has kategori_id to avoid migration failure
    try {
      await connection.query('ALTER TABLE lab_parameter ADD COLUMN kategori_id INT AFTER id');
      console.log('Added kategori_id column to lab_parameter');
    } catch (e) {
      // Column might already exist, ignore error
    }

    try {
      // Make old kategori column nullable if it exists to prevent "doesn't have a default value" errors
      await connection.query('ALTER TABLE lab_parameter MODIFY COLUMN kategori VARCHAR(100) NULL');
    } catch (e) {
      // Column might not exist or other error, ignore
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const lines = schemaSql.split('\n');
    const cleanLines = lines.map(line => {
      const idx = line.indexOf('--');
      if (idx !== -1) {
        return line.substring(0, idx);
      }
      return line;
    });
    const cleanSql = cleanLines.join('\n');
    const queries = cleanSql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    for (const query of queries) {
      await connection.query(query);
    }

    // Seeding ICD-10 diagnostic codes after table creations
    console.log('Migrating: Seeding 100 common ICD-10 diagnostic codes...');
    for (const item of COMMON_ICD10) {
      await connection.query('INSERT IGNORE INTO master_icd10 (kode_icd, deskripsi) VALUES (?, ?)', [item.kode_icd, item.deskripsi]);
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

    if (
      !tableList.includes('user_logs') ||
      !tableList.includes('lab_parameter') || 
      !tableList.includes('obat_master') || 
      !tableList.includes('lab_data_harian') || 
      !tableList.includes('obat_konsumsi_harian') ||
      !tableList.includes('pelayanan_rawat_jalan') ||
      !tableList.includes('pelayanan_rawat_jalan_tindakan') ||
      !tableList.includes('pasien') ||
      !tableList.includes('registrasi_rawat_jalan') ||
      !tableList.includes('master_tindakan') ||
      !tableList.includes('tindakan_rawat_jalan') ||
      !tableList.includes('master_icd10') ||
      !tableList.includes('registrasi_igd') ||
      !tableList.includes('tindakan_igd') ||
      !tableList.includes('registrasi_ranap') ||
      !tableList.includes('tindakan_ranap') ||
      !tableList.includes('dokter') ||
      !tableList.includes('kota') ||
      !tableList.includes('kecamatan') ||
      !tableList.includes('kelurahan')
    ) {
      console.log('Some tables are missing. Automatically running safe migrator on startup...');
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

        const [saldoCols]: any = await mysqlPool.query("SHOW COLUMNS FROM obat_master LIKE 'saldo_awal_tahun'");
        if (saldoCols.length === 0) {
          console.log('Adding columns for saldo_awal to existing obat_master MySQL table...');
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN saldo_awal_tahun INT DEFAULT NULL AFTER reorder_point");
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN saldo_awal_bulan TINYINT DEFAULT NULL AFTER saldo_awal_tahun");
          await mysqlPool.query("ALTER TABLE obat_master ADD COLUMN saldo_awal_nilai INT DEFAULT 0 AFTER saldo_awal_bulan");
          console.log('Saldo awal columns added successfully.');
        }

        const [ralanCols]: any = await mysqlPool.query("SHOW COLUMNS FROM registrasi_rawat_jalan LIKE 'unit'");
        if (ralanCols.length === 0) {
          console.log('Adding column unit to existing registrasi_rawat_jalan MySQL table...');
          await mysqlPool.query("ALTER TABLE registrasi_rawat_jalan ADD COLUMN unit VARCHAR(50) NOT NULL DEFAULT 'Poli Umum' AFTER triase");
          console.log('Column unit added successfully.');
        }

        const [icdCols]: any = await mysqlPool.query("SHOW COLUMNS FROM registrasi_rawat_jalan LIKE 'icd_kode'");
        if (icdCols.length === 0) {
          console.log('Adding column icd_kode to existing registrasi_rawat_jalan MySQL table...');
          await mysqlPool.query("ALTER TABLE registrasi_rawat_jalan ADD COLUMN icd_kode VARCHAR(20) AFTER unit");
          console.log('Column icd_kode added successfully.');
        }

        const [dpjpRalanCols]: any = await mysqlPool.query("SHOW COLUMNS FROM registrasi_rawat_jalan LIKE 'dpjp'");
        if (dpjpRalanCols.length === 0) {
          await mysqlPool.query("ALTER TABLE registrasi_rawat_jalan ADD COLUMN dpjp VARCHAR(250) AFTER icd_kode");
        }

        const [dpjpRanapCols]: any = await mysqlPool.query("SHOW COLUMNS FROM registrasi_ranap LIKE 'dpjp'");
        if (dpjpRanapCols.length === 0) {
          await mysqlPool.query("ALTER TABLE registrasi_ranap ADD COLUMN dpjp VARCHAR(250) AFTER kamar");
        }

        const [dpjpIgdCols]: any = await mysqlPool.query("SHOW COLUMNS FROM registrasi_igd LIKE 'dpjp'");
        if (dpjpIgdCols.length === 0) {
          await mysqlPool.query("ALTER TABLE registrasi_igd ADD COLUMN dpjp VARCHAR(250) AFTER icd_kode");
        }

        // Drop foreign key constraint on registrasi_igd referencing master_icd10 for more flexibility (OPSI A)
        try {
          const [fkRows]: any = await mysqlPool.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'registrasi_igd' 
              AND COLUMN_NAME = 'icd_kode' 
              AND REFERENCED_TABLE_NAME = 'master_icd10'
          `);
          if (fkRows.length > 0) {
            for (const row of fkRows) {
              const constraintName = row.CONSTRAINT_NAME;
              console.log(`Dropping foreign key ${constraintName} on registrasi_igd...`);
              await mysqlPool.query(`ALTER TABLE registrasi_igd DROP FOREIGN KEY ${constraintName}`);
            }
            console.log('Foreign key on registrasi_igd dropped successfully.');
          }
        } catch (err: any) {
          console.warn('Failed to drop foreign key on registrasi_igd:', err.message);
        }

        const [pelaksanaRalan]: any = await mysqlPool.query("SHOW COLUMNS FROM tindakan_rawat_jalan LIKE 'pelaksana'");
        if (pelaksanaRalan.length > 0) {
          await mysqlPool.query("ALTER TABLE tindakan_rawat_jalan DROP COLUMN pelaksana");
        }
        
        const [pelaksanaIgd]: any = await mysqlPool.query("SHOW COLUMNS FROM tindakan_igd LIKE 'pelaksana'");
        if (pelaksanaIgd.length > 0) {
          await mysqlPool.query("ALTER TABLE tindakan_igd DROP COLUMN pelaksana");
        }
        
        const [pelaksanaRanap]: any = await mysqlPool.query("SHOW COLUMNS FROM tindakan_ranap LIKE 'pelaksana'");
        if (pelaksanaRanap.length > 0) {
          await mysqlPool.query("ALTER TABLE tindakan_ranap DROP COLUMN pelaksana");
        }

        // Migrating pasien table new columns if they do not exist
        const [pasienTanggalLahirCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'tanggal_lahir'");
        if (pasienTanggalLahirCol.length === 0) {
          console.log('Adding tanggal_lahir to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN tanggal_lahir DATE AFTER nama");
        }
        const [pasienAlamatCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'alamat'");
        if (pasienAlamatCol.length === 0) {
          console.log('Adding alamat to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN alamat VARCHAR(255) AFTER tanggal_lahir");
        }
        const [pasienJkCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'jenis_kelamin'");
        if (pasienJkCol.length === 0) {
          console.log('Adding jenis_kelamin to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN jenis_kelamin ENUM('L', 'P') AFTER alamat");
        }
        const [pasienKelurahanCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'kelurahan_id'");
        if (pasienKelurahanCol.length === 0) {
          console.log('Adding kelurahan_id to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN kelurahan_id INT AFTER jenis_kelamin");
        }
        const [pasienKecamatanCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'kecamatan_id'");
        if (pasienKecamatanCol.length === 0) {
          console.log('Adding kecamatan_id to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN kecamatan_id INT AFTER kelurahan_id");
        }
        const [pasienKotaCol]: any = await mysqlPool.query("SHOW COLUMNS FROM pasien LIKE 'kota_id'");
        if (pasienKotaCol.length === 0) {
          console.log('Adding kota_id to pasien table...');
          await mysqlPool.query("ALTER TABLE pasien ADD COLUMN kota_id INT AFTER kecamatan_id");
        }

        // Direct check for dokter table to ensure it exists
        const [dokterTable]: any = await mysqlPool.query("SHOW TABLES LIKE 'dokter'");
        if (dokterTable.length === 0) {
          console.log('Explicitly creating missing dokter table...');
          await mysqlPool.query(`
            CREATE TABLE IF NOT EXISTS dokter (
              id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
              nama_dokter VARCHAR(250) NOT NULL,
              status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
              is_active TINYINT(1) NOT NULL DEFAULT 1,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
          `);
          console.log('Dokter table created successfully.');
        }

        // Alter dokter table to modify status enum to support 'aktif' and 'nonaktif'
        try {
          console.log('Fixing dokter table status enum on VPS MySQL...');
          await mysqlPool.query("ALTER TABLE dokter MODIFY COLUMN status ENUM('aktif', 'nonaktif') DEFAULT 'aktif'");
        } catch (err: any) {
          console.warn('Failed to alter dokter status column:', err.message);
        }

        // Alter dokter table to ensure is_active column exists
        try {
          const [isActiveCol]: any = await mysqlPool.query("SHOW COLUMNS FROM dokter LIKE 'is_active'");
          if (isActiveCol.length === 0) {
            console.log('Adding is_active column to dokter table...');
            await mysqlPool.query("ALTER TABLE dokter ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1");
          }
        } catch (err: any) {
          console.warn('Failed to ensure is_active column on dokter:', err.message);
        }

        // Alter master_tindakan table to modify jenis column to VARCHAR(50)
        try {
          console.log('Fixing master_tindakan table jenis column on VPS MySQL...');
          await mysqlPool.query("ALTER TABLE master_tindakan MODIFY COLUMN jenis VARCHAR(50) DEFAULT NULL");
        } catch (err: any) {
          console.warn('Failed to alter master_tindakan jenis column:', err.message);
        }
      } catch (colErr: any) {
        console.error('Failed checking columns on existing tables in Connection:', colErr.message);
      }
    }

    // Seed master_icd10 if it has 0 rows on VPS MySQL
    try {
      const [icdRows]: any = await mysqlPool.query('SELECT COUNT(*) as count FROM master_icd10');
      if (icdRows && icdRows[0] && icdRows[0].count === 0) {
        console.log('Seeding 100 common ICD-10 diagnostic codes to VPS MySQL...');
        for (const item of COMMON_ICD10) {
          await mysqlPool.query('INSERT IGNORE INTO master_icd10 (kode_icd, deskripsi) VALUES (?, ?)', [item.kode_icd, item.deskripsi]);
        }
        console.log('Successfully seeded master_icd10 on VPS MySQL.');
      }
    } catch (dbSeedErr: any) {
      console.warn('Could not seed master_icd10:', dbSeedErr.message);
    }
  } catch (err) {
    console.error('Failed to run automatic startup migrations:', err);
  }
}

// Virtual DB Implementation
// Simple schema state stored in src/db/virtual_db.json
export const COMMON_ICD10 = [
  { kode_icd: 'A09', deskripsi: 'Diare dan gastroenteritis' },
  { kode_icd: 'J00', deskripsi: 'Nasofaringitis akut (common cold)' },
  { kode_icd: 'J06.9', deskripsi: 'Infeksi saluran pernapasan akut, tidak spesifik' },
  { kode_icd: 'J02.9', deskripsi: 'Faringitis akut, tidak spesifik' },
  { kode_icd: 'I10', deskripsi: 'Hipertensi esensial primer' },
  { kode_icd: 'E11.9', deskripsi: 'Diabetes melitus tipe 2 tanpa komplikasi' },
  { kode_icd: 'K29.7', deskripsi: 'Gastritis, tidak spesifik' },
  { kode_icd: 'K30', deskripsi: 'Dispepsia' },
  { kode_icd: 'L23.9', deskripsi: 'Dermatitis kontak alergi, tidak spesifik' },
  { kode_icd: 'L20.9', deskripsi: 'Dermatitis atopik' },
  { kode_icd: 'M54.5', deskripsi: 'Nyeri punggung bawah' },
  { kode_icd: 'M79.1', deskripsi: 'Mialgia' },
  { kode_icd: 'R50.9', deskripsi: 'Demam, tidak spesifik' },
  { kode_icd: 'R51', deskripsi: 'Sakit kepala' },
  { kode_icd: 'A04.9', deskripsi: 'Infeksi saluran cerna bakteri, tidak spesifik' },
  { kode_icd: 'B35.1', deskripsi: 'Tinea unguium (infeksi jamur kuku)' },
  { kode_icd: 'H10.9', deskripsi: 'Konjungtivitis, tidak spesifik' },
  { kode_icd: 'J45.9', deskripsi: 'Asma, tidak spesifik' },
  { kode_icd: 'K76.0', deskripsi: 'Perlemakan hati' },
  { kode_icd: 'N39.0', deskripsi: 'Infeksi saluran kemih, lokasi tidak spesifik' },
  { kode_icd: 'E78.5', deskripsi: 'Hiperlipidemia, tidak spesifik' },
  { kode_icd: 'F41.1', deskripsi: 'Gangguan cemas menyeluruh' },
  { kode_icd: 'G43.9', deskripsi: 'Migrain, tidak spesifik' },
  { kode_icd: 'H66.9', deskripsi: 'Otitis media, tidak spesifik' },
  { kode_icd: 'L70.0', deskripsi: 'Akne vulgaris' },
  { kode_icd: 'M17.9', deskripsi: 'Gonartrosis (osteoartritis lutut)' },
  { kode_icd: 'R05', deskripsi: 'Batuk' },
  { kode_icd: 'R06.0', deskripsi: 'Dispnea (sesak napas)' },
  { kode_icd: 'R07.4', deskripsi: 'Nyeri dada, tidak spesifik' },
  { kode_icd: 'R10.4', deskripsi: 'Nyeri abdomen, tidak spesifik' },
  { kode_icd: 'R11', deskripsi: 'Mual dan muntah' },
  { kode_icd: 'A01.0', deskripsi: 'Demam tifoid' },
  { kode_icd: 'B01.9', deskripsi: 'Varisela (cacar air)' },
  { kode_icd: 'H60.9', deskripsi: 'Otitis eksterna, tidak spesifik' },
  { kode_icd: 'K21.9', deskripsi: 'Penyakit refluks gastroesofagus tanpa esofagitis' },
  { kode_icd: 'L05.0', deskripsi: 'Kista pilonidal' },
  { kode_icd: 'M25.5', deskripsi: 'Nyeri sendi' },
  { kode_icd: 'R63.4', deskripsi: 'Penurunan berat badan yang tidak normal' },
  { kode_icd: 'Z00.0', deskripsi: 'Pemeriksaan kesehatan umum' },
  { kode_icd: 'Z01.0', deskripsi: 'Pemeriksaan mata' },
  { kode_icd: 'A06.0', deskripsi: 'Disentri amuba' },
  { kode_icd: 'B37.0', deskripsi: 'Kandidiasis mulut' },
  { kode_icd: 'D64.9', deskripsi: 'Anemia, tidak spesifik' },
  { kode_icd: 'I83.9', deskripsi: 'Varises vena pada tungkai' },
  { kode_icd: 'J20.9', deskripsi: 'Bronkitis akut, tidak spesifik' },
  { kode_icd: 'K70.3', deskripsi: 'Sirosis hati alkoholik' },
  { kode_icd: 'L29.9', deskripsi: 'Pruritus, tidak spesifik' },
  { kode_icd: 'N94.6', deskripsi: 'Dismenore' },
  { kode_icd: 'R42', deskripsi: 'Vertigo' },
  { kode_icd: 'R53', deskripsi: 'Malaise dan kelelahan' },
  { kode_icd: 'A03.9', deskripsi: 'Shigellosis, tidak spesifik' },
  { kode_icd: 'B35.0', deskripsi: 'Tinea barbae dan tinea capitis' },
  { kode_icd: 'E03.9', deskripsi: 'Hipotiroidisme, tidak spesifik' },
  { kode_icd: 'G40.9', deskripsi: 'Epilepsi, tidak spesifik' },
  { kode_icd: 'I20.9', deskripsi: 'Angina pektoris, tidak spesifik' },
  { kode_icd: 'J30.4', deskripsi: 'Rinitis alergi, tidak spesifik' },
  { kode_icd: 'K80.2', deskripsi: 'Kalkulus empedu' },
  { kode_icd: 'L03.9', deskripsi: 'Selulitis, tidak spesifik' },
  { kode_icd: 'N10', deskripsi: 'Pielonefritis akut' },
  { kode_icd: 'R04.0', deskripsi: 'Epistaksis (mimisan)' },
  { kode_icd: 'A08.4', deskripsi: 'Infeksi virus usus' },
  { kode_icd: 'B02.9', deskripsi: 'Herpes zoster tanpa komplikasi' },
  { kode_icd: 'D50.9', deskripsi: 'Anemia defisiensi besi' },
  { kode_icd: 'E14.9', deskripsi: 'Diabetes melitus, tidak spesifik' },
  { kode_icd: 'G56.0', deskripsi: 'Sindrom karpal tunel' },
  { kode_icd: 'I48', deskripsi: 'Fibrilasi atrium dan flutter' },
  { kode_icd: 'J32.9', deskripsi: 'Sinusitis kronis, tidak spesifik' },
  { kode_icd: 'K52.9', deskripsi: 'Gastroenteritis non-infeksi' },
  { kode_icd: 'L60.0', deskripsi: 'Ingrown nail (cantengan)' },
  { kode_icd: 'N40', deskripsi: 'Hiperplasia prostat' },
  { kode_icd: 'R21', deskripsi: 'Ruam kulit' },
  { kode_icd: 'A27.9', deskripsi: 'Leptospirosis, tidak spesifik' },
  { kode_icd: 'B86', deskripsi: 'Skabies (kudis)' },
  { kode_icd: 'E05.9', deskripsi: 'Hipertiroidisme, tidak spesifik' },
  { kode_icd: 'G93.4', deskripsi: 'Ensefalopati, tidak spesifik' },
  { kode_icd: 'I50.9', deskripsi: 'Gagal jantung, tidak spesifik' },
  { kode_icd: 'J44.9', deskripsi: 'Penyakit paru obstruktif kronis, tidak spesifik' },
  { kode_icd: 'K92.0', deskripsi: 'Hematemesis (muntah darah)' },
  { kode_icd: 'L72.0', deskripsi: 'Kista epidermal' },
  { kode_icd: 'N60.0', deskripsi: 'Displasia payudara jinak' },
  { kode_icd: 'R56.0', deskripsi: 'Kejang demam' },
  { kode_icd: 'A46', deskripsi: 'Erisipelas' },
  { kode_icd: 'B37.9', deskripsi: 'Kandidiasis, tidak spesifik' },
  { kode_icd: 'D23.9', deskripsi: 'Neoplasma jinak kulit' },
  { kode_icd: 'E16.2', deskripsi: 'Hipoglikemia, tidak spesifik' },
  { kode_icd: 'G47.0', deskripsi: 'Insomnia' },
  { kode_icd: 'I63.9', deskripsi: 'Infark serebral, tidak spesifik' },
  { kode_icd: 'J01.9', deskripsi: 'Sinusitis akut, tidak spesifik' },
  { kode_icd: 'K35.8', deskripsi: 'Apendisitis akut' },
  { kode_icd: 'L30.9', deskripsi: 'Dermatitis, tidak spesifik' },
  { kode_icd: 'N80.9', deskripsi: 'Endometriosis, tidak spesifik' },
  { kode_icd: 'R60.9', deskripsi: 'Edema, tidak spesifik' },
  { kode_icd: 'A09.0', deskripsi: 'Diare infeksius' },
  { kode_icd: 'B08.4', deskripsi: 'Penyakit tangan, kaki, dan mulut' },
  { kode_icd: 'E78.0', deskripsi: 'Hiperkolesterolemia murni' },
  { kode_icd: 'H91.9', deskripsi: 'Gangguan pendengaran' },
  { kode_icd: 'I95.9', deskripsi: 'Hipotensi, tidak spesifik' },
  { kode_icd: 'J40', deskripsi: 'Bronkitis' },
  { kode_icd: 'K59.0', deskripsi: 'Konstipasi' },
  { kode_icd: 'K25.9', deskripsi: 'Ulkus lambung' }
];

interface VirtualDatabase {
  users: any[];
  user_logs?: any[];
  lab_parameter: any[];
  lab_data_bulanan: any[];
  lab_data_harian?: any[];
  obat_master: any[];
  obat_konsumsi_bulanan: any[];
  obat_konsumsi_harian?: any[];
  obat_forecasting: any[];
  pelayanan_rawat_jalan?: any[];
  pelayanan_rawat_jalan_tindakan?: any[];
  pasien: any[];
  master_tindakan?: any[];
  registrasi_rawat_jalan?: any[];
  tindakan_rawat_jalan?: any[];
  master_icd10?: any[];
  kota?: any[];
  kecamatan?: any[];
  kelurahan?: any[];
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
    master_icd10: COMMON_ICD10.map((item, idx) => ({ id: idx + 1, ...item })),
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
    obat_forecasting: [],
    pasien: [
      { no_rm: '002502', nama: 'MADE YULIANA' },
      { no_rm: '002503', nama: 'JURIAH' },
      { no_rm: '002123', nama: 'MUHAMMAD RIDHO PRAYOGA' },
      { no_rm: '002505', nama: 'JIHAN' },
      { no_rm: '001889', nama: 'MUBARIKA SEKARSARI YUSUF' },
      { no_rm: '000611', nama: 'DELLA TRISYANASARI, Ny' }
    ],
    master_tindakan: [
      { id: 1, nama_tindakan: 'INJEKSI (IM/IV/SC) (UMUM)', jenis: 'RALAN' },
      { id: 2, nama_tindakan: 'KONSULTASI DOKTER UMUM', jenis: 'RALAN' },
      { id: 3, nama_tindakan: 'TINDAKAN PEMASANGAN INFUS (IV LINE)', jenis: 'RALAN' },
      { id: 4, nama_tindakan: 'INFUS BOOSTER EXTRA HEALTHY', jenis: 'RALAN' },
      { id: 5, nama_tindakan: 'KONSULTASI + USG 4D', jenis: 'RALAN' },
      { id: 6, nama_tindakan: 'KONSULTASI + USG 2D', jenis: 'RALAN' }
    ],
    registrasi_rawat_jalan: [
      { id: 1, no_registrasi: 'RJ07062026-00001', pasien_no_rm: '002502', tanggal_pelayanan: '2026-06-07', triase: 'hijau' },
      { id: 2, no_registrasi: 'RJ07062026-00002', pasien_no_rm: '002503', tanggal_pelayanan: '2026-06-07', triase: 'hijau' },
      { id: 3, no_registrasi: 'RJ07062026-00003', pasien_no_rm: '002123', tanggal_pelayanan: '2026-06-07', triase: 'hijau' },
      { id: 4, no_registrasi: 'RJ08062026-00001', pasien_no_rm: '002505', tanggal_pelayanan: '2026-06-08', triase: 'merah' },
      { id: 5, no_registrasi: 'RJ08062026-00002', pasien_no_rm: '001889', tanggal_pelayanan: '2026-06-08', triase: 'kuning' },
      { id: 6, no_registrasi: 'RJ08062026-00003', pasien_no_rm: '000611', tanggal_pelayanan: '2026-06-08', triase: 'hijau' }
    ],
    tindakan_rawat_jalan: [
      { id: 1, registrasi_id: 1, tindakan_id: 1, pelaksana: 'Dea Oktarika, S.Keb.', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:09:57', tarif_tindakan: 18000, tarif_sarana: 12600, tarif_pelayanan: 5400, tarif_medis: 0, jumlah: 1, subtotal: 18000 },
      { id: 2, registrasi_id: 1, tindakan_id: 2, pelaksana: 'dr. Muhammad Jundi Nasrullah', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:08:50', tarif_tindakan: 35000, tarif_sarana: 20000, tarif_pelayanan: 15000, tarif_medis: 0, jumlah: 1, subtotal: 35000 },
      { id: 3, registrasi_id: 1, tindakan_id: 3, pelaksana: 'Rola Sintia Putri, Amd.Kep', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:09:11', tarif_tindakan: 35000, tarif_sarana: 21000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 35000 },
      { id: 4, registrasi_id: 2, tindakan_id: 4, pelaksana: 'Dea Oktarika, S.Keb.', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '11:58:33', tarif_tindakan: 175000, tarif_sarana: 161000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 175000 },
      { id: 5, registrasi_id: 3, tindakan_id: 1, pelaksana: 'Zulfakar Alfatih, A.Md.Kep.', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:37:11', tarif_tindakan: 18000, tarif_sarana: 12600, tarif_pelayanan: 5400, tarif_medis: 0, jumlah: 1, subtotal: 18000 },
      { id: 6, registrasi_id: 3, tindakan_id: 2, pelaksana: 'dr. Taufik Hidayat', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:30:35', tarif_tindakan: 35000, tarif_sarana: 20000, tarif_pelayanan: 15000, tarif_medis: 0, jumlah: 1, subtotal: 35000 },
      { id: 7, registrasi_id: 3, tindakan_id: 3, pelaksana: 'Olsa Niaroka, S.Tr.Keb.,Bd.', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:37:01', tarif_tindakan: 35000, tarif_sarana: 21000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 35000 },
      { id: 8, registrasi_id: 4, tindakan_id: 5, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:10:15', tarif_tindakan: 235000, tarif_sarana: 95000, tarif_pelayanan: 140000, tarif_medis: 0, jumlah: 1, subtotal: 235000 },
      { id: 9, registrasi_id: 5, tindakan_id: 6, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:27:15', tarif_tindakan: 185000, tarif_sarana: 75000, tarif_pelayanan: 110000, tarif_medis: 0, jumlah: 1, subtotal: 185000 },
      { id: 10, registrasi_id: 6, tindakan_id: 6, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:45:24', tarif_tindakan: 185000, tarif_sarana: 75000, tarif_pelayanan: 110000, tarif_medis: 0, jumlah: 1, subtotal: 185000 }
    ]
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

  // Seed Outpatient Care & Procedures (Rawat Jalan & Tindakan)
  defaultDb.pelayanan_rawat_jalan = [
    { id: 1, no_registrasi: 'RJ07062026-00001', no_rm: '002502', nama_pasien: 'MADE YULIANA', tanggal_pelayanan: '2026-06-07', created_at: new Date('2026-06-07T10:00:00Z').toISOString() },
    { id: 2, no_registrasi: 'RJ07062026-00002', no_rm: '002503', nama_pasien: 'JURIAH', tanggal_pelayanan: '2026-06-07', created_at: new Date('2026-06-07T11:50:00Z').toISOString() },
    { id: 3, no_registrasi: 'RJ07062026-00003', no_rm: '002123', nama_pasien: 'MUHAMMAD RIDHO PRAYOGA', tanggal_pelayanan: '2026-06-07', created_at: new Date('2026-06-07T19:25:00Z').toISOString() },
    { id: 4, no_registrasi: 'RJ08062026-00001', no_rm: '002505', nama_pasien: 'JIHAN', tanggal_pelayanan: '2026-06-08', created_at: new Date('2026-06-08T15:00:00Z').toISOString() },
    { id: 5, no_registrasi: 'RJ08062026-00002', no_rm: '001889', nama_pasien: 'MUBARIKA SEKARSARI YUSUF', tanggal_pelayanan: '2026-06-08', created_at: new Date('2026-06-08T15:20:00Z').toISOString() },
    { id: 6, no_registrasi: 'RJ08062026-00003', no_rm: '000611', nama_pasien: 'DELLA TRISYANASARI, Ny', tanggal_pelayanan: '2026-06-08', created_at: new Date('2026-06-08T15:40:00Z').toISOString() }
  ];

  defaultDb.pelayanan_rawat_jalan_tindakan = [
    { id: 1, rawat_jalan_id: 1, pelaksana: 'Dea Oktarika, S.Keb.', tindakan_nama: 'INJEKSI (IM/IV/SC) (UMUM)', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:09:57', tarif_tindakan: 18000, tarif_sarana: 12600, tarif_pelayanan: 5400, tarif_medis: 0, jumlah: 1, subtotal: 18000, created_at: new Date('2026-06-07T10:09:57Z').toISOString() },
    { id: 2, rawat_jalan_id: 1, pelaksana: 'dr. Muhammad Jundi Nasrullah', tindakan_nama: 'KONSULTASI DOKTER UMUM', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:08:50', tarif_tindakan: 35000, tarif_sarana: 20000, tarif_pelayanan: 15000, tarif_medis: 0, jumlah: 1, subtotal: 35000, created_at: new Date('2026-06-07T10:08:50Z').toISOString() },
    { id: 3, rawat_jalan_id: 1, pelaksana: 'Rola Sintia Putri, Amd.Kep', tindakan_nama: 'TINDAKAN PEMASANGAN INFUS (IV LINE)', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '10:09:11', tarif_tindakan: 35000, tarif_sarana: 21000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 35000, created_at: new Date('2026-06-07T10:09:11Z').toISOString() },
    { id: 4, rawat_jalan_id: 2, pelaksana: 'Dea Oktarika, S.Keb.', tindakan_nama: 'INFUS BOOSTER EXTRA HEALTHY', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '11:58:33', tarif_tindakan: 175000, tarif_sarana: 161000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 175000, created_at: new Date('2026-06-07T11:58:33Z').toISOString() },
    { id: 5, rawat_jalan_id: 3, pelaksana: 'Zulfakar Alfatih, A.Md.Kep.', tindakan_nama: 'INJEKSI (IM/IV/SC) (UMUM)', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:37:11', tarif_tindakan: 18000, tarif_sarana: 12600, tarif_pelayanan: 5400, tarif_medis: 0, jumlah: 1, subtotal: 18000, created_at: new Date('2026-06-07T19:37:11Z').toISOString() },
    { id: 6, rawat_jalan_id: 3, pelaksana: 'dr. Taufik Hidayat', tindakan_nama: 'KONSULTASI DOKTER UMUM', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:30:35', tarif_tindakan: 35000, tarif_sarana: 20000, tarif_pelayanan: 15000, tarif_medis: 0, jumlah: 1, subtotal: 35000, created_at: new Date('2026-06-07T19:30:35Z').toISOString() },
    { id: 7, rawat_jalan_id: 3, pelaksana: 'Olsa Niaroka, S.Tr.Keb.,Bd.', tindakan_nama: 'TINDAKAN PEMASANGAN INFUS (IV LINE)', tindakan_keterangan: '', tindakan_tanggal: '2026-06-07', tindakan_jam: '19:37:01', tarif_tindakan: 35000, tarif_sarana: 21000, tarif_pelayanan: 14000, tarif_medis: 0, jumlah: 1, subtotal: 35000, created_at: new Date('2026-06-07T19:37:01Z').toISOString() },
    { id: 8, rawat_jalan_id: 4, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_nama: 'KONSULTASI + USG 4D', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:10:15', tarif_tindakan: 235000, tarif_sarana: 95000, tarif_pelayanan: 140000, tarif_medis: 0, jumlah: 1, subtotal: 235000, created_at: new Date('2026-06-08T15:10:15Z').toISOString() },
    { id: 9, rawat_jalan_id: 5, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_nama: 'KONSULTASI + USG 2D', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:27:15', tarif_tindakan: 185000, tarif_sarana: 75000, tarif_pelayanan: 110000, tarif_medis: 0, jumlah: 1, subtotal: 185000, created_at: new Date('2026-06-08T15:27:15Z').toISOString() },
    { id: 10, rawat_jalan_id: 6, pelaksana: 'dr. Elvita Asril,Sp.OG', tindakan_nama: 'KONSULTASI + USG 2D', tindakan_keterangan: '', tindakan_tanggal: '2026-06-08', tindakan_jam: '15:45:24', tarif_tindakan: 185000, tarif_sarana: 75000, tarif_pelayanan: 110000, tarif_medis: 0, jumlah: 1, subtotal: 185000, created_at: new Date('2026-06-08T15:45:24Z').toISOString() }
  ];

  fs.writeFileSync(VIRTUAL_DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
}

// Read database contents
export function readVirtualDb(): VirtualDatabase {
  if (!fs.existsSync(VIRTUAL_DB_FILE)) {
    initVirtualDb();
  }
  const data: VirtualDatabase = JSON.parse(fs.readFileSync(VIRTUAL_DB_FILE, 'utf8'));
  let updated = false;
  if (!data.user_logs) {
    data.user_logs = [];
    updated = true;
  }
  if (!data.kota) {
    data.kota = [
      { id: 1, nama: 'Jakarta Selatan' },
      { id: 2, nama: 'Bandung' },
      { id: 3, nama: 'Surabaya' }
    ];
    updated = true;
  }
  if (!data.kecamatan) {
    data.kecamatan = [
      { id: 1, kota_id: 1, nama: 'Kebayoran Baru' },
      { id: 2, kota_id: 1, nama: 'Cilandak' },
      { id: 3, kota_id: 2, nama: 'Coblong' }
    ];
    updated = true;
  }
  if (!data.kelurahan) {
    data.kelurahan = [
      { id: 1, kecamatan_id: 1, nama: 'Senayan' },
      { id: 2, kecamatan_id: 1, nama: 'Selong' },
      { id: 3, kecamatan_id: 3, nama: 'Dago' }
    ];
    updated = true;
  }
  if (!data.master_icd10 || data.master_icd10.length < 50) {
    data.master_icd10 = COMMON_ICD10.map((item, idx) => ({ id: idx + 1, ...item }));
    updated = true;
  }
  if (data.obat_master) {
    data.obat_master = data.obat_master.map((o: any) => {
      if (o.saldo_awal_tahun === undefined || o.saldo_awal_bulan === undefined || o.saldo_awal_nilai === undefined) {
        updated = true;
        return {
          ...o,
          saldo_awal_tahun: o.saldo_awal_tahun !== undefined ? o.saldo_awal_tahun : null,
          saldo_awal_bulan: o.saldo_awal_bulan !== undefined ? o.saldo_awal_bulan : null,
          saldo_awal_nilai: o.saldo_awal_nilai !== undefined ? o.saldo_awal_nilai : 0
        };
      }
      return o;
    });
  }
  if (updated) {
    fs.writeFileSync(VIRTUAL_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  }
  return data;
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
        const isConnError = [
          'ECONNREFUSED',
          'ETIMEDOUT',
          'ENOTFOUND',
          'PROTOCOL_CONNECTION_LOST',
          'HANDSHAKE_TIMEOUT'
        ].includes(err.code) || err.message?.toLowerCase().includes('connect') || err.message?.toLowerCase().includes('lost connection');

        if (isConnError) {
          console.warn(`MySQL connection dropped: ${err.message}. Switching to Virtual DB.`);
          dbStatusInfo.isVirtual = true;
          dbStatusInfo.status = 'OFFLINE';
          dbStatusInfo.error = `Database connection lost: ${err.message}`;
        } else {
          // Relational, unique constraint, duplicate, or schema syntax error: Must throw so bulk actions do not get corrupted
          console.error(`MySQL Schema/Validation Error: ${err.message}`);
          throw err;
        }
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

  // 0. USER LOGS SIMULATION
  if (norm.startsWith('INSERT INTO user_logs')) {
    const [email, action_type, module_name, description] = params;
    const newLog = {
      id: vdb.user_logs && vdb.user_logs.length > 0 ? Math.max(...vdb.user_logs.map((l: any) => l.id)) + 1 : 1,
      email,
      action_type,
      module_name,
      description,
      created_at: new Date().toISOString()
    };
    if (!vdb.user_logs) vdb.user_logs = [];
    vdb.user_logs.push(newLog);
    writeVirtualDb(vdb);
    return { insertId: newLog.id };
  }

  if (norm.startsWith('SELECT * FROM user_logs') || norm.startsWith('SELECT user_logs')) {
    const logs = [...(vdb.user_logs || [])];
    logs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return logs;
  }

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
    if (norm.includes('c.tanggal >= ? AND c.tanggal <= ?')) {
      const [start, end] = params;
      res = res.filter(x => x.tanggal >= String(start) && x.tanggal <= String(end));
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

  // --- 8. PELAYANAN RAWAT JALAN ---
  if (norm.startsWith('SELECT * FROM pelayanan_rawat_jalan')) {
    const list = vdb.pelayanan_rawat_jalan || [];
    return [...list].sort((a,b) => {
      const cmpDate = new Date(b.tanggal_pelayanan).getTime() - new Date(a.tanggal_pelayanan).getTime();
      if (cmpDate !== 0) return cmpDate;
      return b.id - a.id;
    });
  }

  if (norm.startsWith('SELECT * FROM pelayanan_rawat_jalan_tindakan WHERE rawat_jalan_id = ?')) {
    const rjid = Number(params[0]);
    const list = vdb.pelayanan_rawat_jalan_tindakan || [];
    return list.filter(t => t.rawat_jalan_id === rjid);
  }

  if (norm.startsWith('SELECT * FROM pelayanan_rawat_jalan_tindakan')) {
    return vdb.pelayanan_rawat_jalan_tindakan || [];
  }

  if (norm.startsWith('INSERT INTO pelayanan_rawat_jalan')) {
    const [no_reg, no_rm, nama, tgl] = params;
    const list = vdb.pelayanan_rawat_jalan || [];
    const newId = list.length > 0 ? Math.max(...list.map(x => x.id)) + 1 : 1;
    const record = {
      id: newId,
      no_registrasi: no_reg,
      no_rm: no_rm,
      nama_pasien: nama,
      tanggal_pelayanan: tgl,
      created_at: new Date().toISOString()
    };
    if (!vdb.pelayanan_rawat_jalan) vdb.pelayanan_rawat_jalan = [];
    vdb.pelayanan_rawat_jalan.push(record);
    writeVirtualDb(vdb);
    return { insertId: newId };
  }

  if (norm.startsWith('INSERT INTO pelayanan_rawat_jalan_tindakan')) {
    const [rjid, pelaksana, t_nama, t_ket, t_tgl, t_jam, t_tarif, t_sarana, t_pel, t_medis, qty, sub] = params;
    const list = vdb.pelayanan_rawat_jalan_tindakan || [];
    const newId = list.length > 0 ? Math.max(...list.map(x => x.id)) + 1 : 1;
    const action = {
      id: newId,
      rawat_jalan_id: Number(rjid),
      pelaksana: pelaksana,
      tindakan_nama: t_nama,
      tindakan_keterangan: t_ket || '',
      tindakan_tanggal: t_tgl,
      tindakan_jam: t_jam,
      tarif_tindakan: Number(t_tarif || 0),
      tarif_sarana: Number(t_sarana || 0),
      tarif_pelayanan: Number(t_pel || 0),
      tarif_medis: Number(t_medis || 0),
      jumlah: Number(qty || 1),
      subtotal: Number(sub || 0),
      created_at: new Date().toISOString()
    };
    if (!vdb.pelayanan_rawat_jalan_tindakan) vdb.pelayanan_rawat_jalan_tindakan = [];
    vdb.pelayanan_rawat_jalan_tindakan.push(action);
    writeVirtualDb(vdb);
    return { insertId: newId };
  }

  if (norm.startsWith('UPDATE pelayanan_rawat_jalan SET no_rm = ?, nama_pasien = ?, tanggal_pelayanan = ? WHERE id = ?')) {
    const [no_rm, nama, tgl, id] = params;
    const list = vdb.pelayanan_rawat_jalan || [];
    const idx = list.findIndex(x => x.id === Number(id));
    if (idx !== -1) {
      list[idx].no_rm = no_rm;
      list[idx].nama_pasien = nama;
      list[idx].tanggal_pelayanan = tgl;
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM pelayanan_rawat_jalan WHERE id = ?')) {
    const id = Number(params[0]);
    if (vdb.pelayanan_rawat_jalan) {
      vdb.pelayanan_rawat_jalan = vdb.pelayanan_rawat_jalan.filter(x => x.id !== id);
    }
    if (vdb.pelayanan_rawat_jalan_tindakan) {
      vdb.pelayanan_rawat_jalan_tindakan = vdb.pelayanan_rawat_jalan_tindakan.filter(x => x.rawat_jalan_id !== id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM pelayanan_rawat_jalan_tindakan WHERE rawat_jalan_id = ?')) {
    const rjid = Number(params[0]);
    if (vdb.pelayanan_rawat_jalan_tindakan) {
      vdb.pelayanan_rawat_jalan_tindakan = vdb.pelayanan_rawat_jalan_tindakan.filter(x => x.rawat_jalan_id !== rjid);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- 8.5 PASIEN (VIRTUAL DB) ---
  if (norm.startsWith('SELECT p.*, k.nama as kota_nama, kec.nama as kecamatan_nama, kel.nama as kelurahan_nama FROM pasien p') ||
      norm.startsWith('SELECT * FROM pasien')) {
    if (!vdb.pasien) vdb.pasien = [];
    if (!vdb.kota) vdb.kota = [];
    if (!vdb.kecamatan) vdb.kecamatan = [];
    if (!vdb.kelurahan) vdb.kelurahan = [];
    return vdb.pasien.map((p: any) => {
      const k = vdb.kota.find((kt: any) => kt.id === Number(p.kota_id));
      const kec = vdb.kecamatan.find((kc: any) => kc.id === Number(p.kecamatan_id));
      const kel = vdb.kelurahan.find((kl: any) => kl.id === Number(p.kelurahan_id));
      return {
        ...p,
        kota_nama: k ? k.nama : null,
        kecamatan_nama: kec ? kec.nama : null,
        kelurahan_nama: kel ? kel.nama : null
      };
    });
  }

  if (norm.startsWith('INSERT INTO pasien (no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id)')) {
    const [no_rm, nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id] = params;
    if (!vdb.pasien) vdb.pasien = [];
    // Remove duplicates if already exists
    vdb.pasien = vdb.pasien.filter(p => String(p.no_rm).toLowerCase() !== String(no_rm).toLowerCase());
    vdb.pasien.push({
      no_rm: String(no_rm),
      nama: String(nama),
      tanggal_lahir: tanggal_lahir ? String(tanggal_lahir) : null,
      alamat: alamat ? String(alamat) : null,
      jenis_kelamin: jenis_kelamin ? String(jenis_kelamin) : null,
      kota_id: kota_id ? Number(kota_id) : null,
      kecamatan_id: kecamatan_id ? Number(kecamatan_id) : null,
      kelurahan_id: kelurahan_id ? Number(kelurahan_id) : null
    });
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('INSERT INTO pasien') || norm.startsWith('INSERT IGNORE INTO pasien')) {
    // Fallback simple insert
    const [no_rm, nama] = params;
    if (!vdb.pasien) vdb.pasien = [];
    const exists = vdb.pasien.some(p => String(p.no_rm).toLowerCase() === String(no_rm).toLowerCase());
    if (!exists) {
      vdb.pasien.push({ 
        no_rm: String(no_rm), 
        nama: String(nama),
        tanggal_lahir: null,
        alamat: null,
        jenis_kelamin: null,
        kota_id: null,
        kecamatan_id: null,
        kelurahan_id: null
      });
      writeVirtualDb(vdb);
    }
    return { affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE pasien SET nama = ?, tanggal_lahir = ?, alamat = ?, jenis_kelamin = ?, kota_id = ?, kecamatan_id = ?, kelurahan_id = ? WHERE no_rm = ?')) {
    const [nama, tanggal_lahir, alamat, jenis_kelamin, kota_id, kecamatan_id, kelurahan_id, no_rm] = params;
    if (!vdb.pasien) vdb.pasien = [];
    const idx = vdb.pasien.findIndex(p => String(p.no_rm).toLowerCase() === String(no_rm).toLowerCase());
    if (idx !== -1) {
      vdb.pasien[idx].nama = String(nama);
      vdb.pasien[idx].tanggal_lahir = tanggal_lahir ? String(tanggal_lahir) : null;
      vdb.pasien[idx].alamat = alamat ? String(alamat) : null;
      vdb.pasien[idx].jenis_kelamin = jenis_kelamin ? String(jenis_kelamin) : null;
      vdb.pasien[idx].kota_id = kota_id ? Number(kota_id) : null;
      vdb.pasien[idx].kecamatan_id = kecamatan_id ? Number(kecamatan_id) : null;
      vdb.pasien[idx].kelurahan_id = kelurahan_id ? Number(kelurahan_id) : null;
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // --- 8.5.1 MASTER WILAYAH (VIRTUAL DB) ---
  if (norm.startsWith('SELECT * FROM kota')) {
    if (!vdb.kota) vdb.kota = [];
    return vdb.kota;
  }

  if (norm.startsWith('INSERT INTO kota (nama) VALUES (?)')) {
    const [nama] = params;
    if (!vdb.kota) vdb.kota = [];
    const newId = vdb.kota.length > 0 ? Math.max(...vdb.kota.map(k => k.id)) + 1 : 1;
    vdb.kota.push({ id: newId, nama: String(nama) });
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM kota WHERE id = ?')) {
    const id = Number(params[0]);
    if (!vdb.kota) vdb.kota = [];
    vdb.kota = vdb.kota.filter(k => k.id !== id);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('SELECT kec.*, k.nama as kota_nama FROM kecamatan kec') || 
      norm.startsWith('SELECT kec.*, k.nama as kota_nama FROM kecamatan') ||
      norm.startsWith('SELECT * FROM kecamatan')) {
    if (!vdb.kecamatan) vdb.kecamatan = [];
    if (!vdb.kota) vdb.kota = [];
    return vdb.kecamatan.map((kec: any) => {
      const k = vdb.kota.find((kt: any) => kt.id === Number(kec.kota_id));
      return {
        ...kec,
        kota_nama: k ? k.nama : null
      };
    });
  }

  if (norm.startsWith('INSERT INTO kecamatan (nama, kota_id) VALUES (?, ?)')) {
    const [nama, kota_id] = params;
    if (!vdb.kecamatan) vdb.kecamatan = [];
    const newId = vdb.kecamatan.length > 0 ? Math.max(...vdb.kecamatan.map(k => k.id)) + 1 : 1;
    vdb.kecamatan.push({ id: newId, nama: String(nama), kota_id: Number(kota_id) });
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM kecamatan WHERE id = ?')) {
    const id = Number(params[0]);
    if (!vdb.kecamatan) vdb.kecamatan = [];
    vdb.kecamatan = vdb.kecamatan.filter(k => k.id !== id);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('SELECT kel.*, kec.nama as kecamatan_nama FROM kelurahan kel') || 
      norm.startsWith('SELECT kel.*, kec.nama as kecamatan_nama FROM kelurahan') ||
      norm.startsWith('SELECT * FROM kelurahan')) {
    if (!vdb.kelurahan) vdb.kelurahan = [];
    if (!vdb.kecamatan) vdb.kecamatan = [];
    return vdb.kelurahan.map((kel: any) => {
      const kec = vdb.kecamatan.find((kc: any) => kc.id === Number(kel.kecamatan_id));
      return {
        ...kel,
        kecamatan_nama: kec ? kec.nama : null
      };
    });
  }

  if (norm.startsWith('INSERT INTO kelurahan (nama, kecamatan_id) VALUES (?, ?)')) {
    const [nama, kecamatan_id] = params;
    if (!vdb.kelurahan) vdb.kelurahan = [];
    const newId = vdb.kelurahan.length > 0 ? Math.max(...vdb.kelurahan.map(k => k.id)) + 1 : 1;
    vdb.kelurahan.push({ id: newId, nama: String(nama), kecamatan_id: Number(kecamatan_id) });
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM kelurahan WHERE id = ?')) {
    const id = Number(params[0]);
    if (!vdb.kelurahan) vdb.kelurahan = [];
    vdb.kelurahan = vdb.kelurahan.filter(k => k.id !== id);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- 8.5.2 REGISTRASI RAWAT JALAN & TINDAKAN RAWAT JALAN SIMULATION ---
  if (norm.startsWith('SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase FROM registrasi_rawat_jalan r JOIN pasien p ON r.pasien_no_rm = p.no_rm') ||
      norm.startsWith('SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.unit FROM registrasi_rawat_jalan r JOIN pasien p ON r.pasien_no_rm = p.no_rm')) {
    if (!vdb.registrasi_rawat_jalan) vdb.registrasi_rawat_jalan = [];
    if (!vdb.pasien) vdb.pasien = [];
    return vdb.registrasi_rawat_jalan.map((r: any) => {
      const p = vdb.pasien.find(pas => String(pas.no_rm).toLowerCase() === String(r.pasien_no_rm).toLowerCase());
      return {
        id: r.id,
        no_registrasi: r.no_registrasi,
        no_rm: r.pasien_no_rm,
        nama_pasien: p ? p.nama : 'Pasien',
        tanggal_pelayanan: r.tanggal_pelayanan,
        triase: r.triase || 'hijau',
        unit: r.unit || 'Poli Umum'
      };
    }).sort((a, b) => {
      const dateA = new Date(a.tanggal_pelayanan).getTime();
      const dateB = new Date(b.tanggal_pelayanan).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });
  }

  if (norm.startsWith('SELECT t.registrasi_id, t.pelaksana, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal FROM tindakan_rawat_jalan t JOIN master_tindakan m ON t.tindakan_id = m.id')) {
    if (!vdb.tindakan_rawat_jalan) vdb.tindakan_rawat_jalan = [];
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    return vdb.tindakan_rawat_jalan.map((t: any) => {
      const m = vdb.master_tindakan.find(mt => mt.id === t.tindakan_id);
      return {
        registrasi_id: t.registrasi_id,
        pelaksana: t.pelaksana,
        nama_tindakan: m ? m.nama_tindakan : 'Tindakan',
        tindakan_keterangan: t.tindakan_keterangan,
        tindakan_tanggal: t.tindakan_tanggal,
        tindakan_jam: t.tindakan_jam,
        tarif_tindakan: Number(t.tarif_tindakan || 0),
        tarif_sarana: Number(t.tarif_sarana || 0),
        tarif_pelayanan: Number(t.tarif_pelayanan || 0),
        tarif_medis: Number(t.tarif_medis || 0),
        jumlah: Number(t.jumlah || 1),
        subtotal: Number(t.subtotal || 0)
      };
    });
  }

  if (norm.startsWith('INSERT INTO registrasi_rawat_jalan')) {
    let no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, unit;
    if (params.length === 5) {
      [no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, unit] = params;
    } else {
      [no_registrasi, pasien_no_rm, tanggal_pelayanan, triase] = params;
    }
    if (!vdb.registrasi_rawat_jalan) vdb.registrasi_rawat_jalan = [];
    const newId = vdb.registrasi_rawat_jalan.length > 0 ? Math.max(...vdb.registrasi_rawat_jalan.map(x => x.id)) + 1 : 1;
    const record = {
      id: newId,
      no_registrasi,
      pasien_no_rm,
      tanggal_pelayanan,
      triase: triase || 'hijau',
      unit: unit || 'Poli Umum'
    };
    vdb.registrasi_rawat_jalan.push(record);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('INSERT INTO tindakan_rawat_jalan')) {
    let registrasi_id, tindakan_id, pelaksana = null, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal;
    if (params.length === 11) {
      [
        registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    } else {
      [
        registrasi_id, tindakan_id, pelaksana, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    }
    if (!vdb.tindakan_rawat_jalan) vdb.tindakan_rawat_jalan = [];
    const newId = vdb.tindakan_rawat_jalan.length > 0 ? Math.max(...vdb.tindakan_rawat_jalan.map(x => x.id)) + 1 : 1;
    const action = {
      id: newId,
      registrasi_id: Number(registrasi_id),
      tindakan_id: Number(tindakan_id),
      pelaksana,
      tindakan_keterangan: tindakan_keterangan || '',
      tindakan_tanggal,
      tindakan_jam,
      tarif_tindakan: Number(tarif_tindakan || 0),
      tarif_sarana: Number(tarif_sarana || 0),
      tarif_pelayanan: Number(tarif_pelayanan || 0),
      tarif_medis: Number(tarif_medis || 0),
      jumlah: Number(jumlah || 1),
      subtotal: Number(subtotal || 0)
    };
    vdb.tindakan_rawat_jalan.push(action);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE registrasi_rawat_jalan SET')) {
    const id = Number(params[params.length - 1]);
    const pasien_no_rm = params[0];
    const tanggal_pelayanan = params[1];
    const triase = params[2];
    const unit = params[3];
    const icd_kode = params.length >= 6 ? params[4] : null;
    const dpjp = params.length >= 7 ? params[5] : null;

    if (!vdb.registrasi_rawat_jalan) vdb.registrasi_rawat_jalan = [];
    const idx = vdb.registrasi_rawat_jalan.findIndex(r => r.id === id);
    if (idx !== -1) {
      vdb.registrasi_rawat_jalan[idx].pasien_no_rm = pasien_no_rm;
      vdb.registrasi_rawat_jalan[idx].tanggal_pelayanan = tanggal_pelayanan;
      vdb.registrasi_rawat_jalan[idx].triase = triase || 'hijau';
      if (unit !== undefined) {
        vdb.registrasi_rawat_jalan[idx].unit = unit;
      }
      if (icd_kode !== undefined) {
        vdb.registrasi_rawat_jalan[idx].icd_kode = icd_kode;
      }
      if (dpjp !== undefined) {
        vdb.registrasi_rawat_jalan[idx].dpjp = dpjp;
      }
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM registrasi_rawat_jalan WHERE id = ?')) {
    const id = Number(params[0]);
    if (vdb.registrasi_rawat_jalan) {
      vdb.registrasi_rawat_jalan = vdb.registrasi_rawat_jalan.filter(x => x.id !== id);
    }
    if (vdb.tindakan_rawat_jalan) {
      vdb.tindakan_rawat_jalan = vdb.tindakan_rawat_jalan.filter(x => x.registrasi_id !== id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM tindakan_rawat_jalan WHERE registrasi_id = ?')) {
    const reg_id = Number(params[0]);
    if (vdb.tindakan_rawat_jalan) {
      vdb.tindakan_rawat_jalan = vdb.tindakan_rawat_jalan.filter(x => x.registrasi_id !== reg_id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- IGD SIMULATION (VIRTUAL DB) ---
  if (norm.startsWith('SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.icd_kode FROM registrasi_igd r JOIN pasien p ON r.pasien_no_rm = p.no_rm')) {
    if (!vdb.registrasi_igd) vdb.registrasi_igd = [];
    if (!vdb.pasien) vdb.pasien = [];
    return vdb.registrasi_igd.map((r: any) => {
      const p = vdb.pasien.find(pas => String(pas.no_rm).toLowerCase() === String(r.pasien_no_rm).toLowerCase());
      return {
        id: r.id,
        no_registrasi: r.no_registrasi,
        no_rm: r.pasien_no_rm,
        nama_pasien: p ? p.nama : 'Pasien',
        tanggal_pelayanan: r.tanggal_pelayanan,
        triase: r.triase || 'hijau',
        icd_kode: r.icd_kode || ''
      };
    }).sort((a, b) => {
      const dateA = new Date(a.tanggal_pelayanan).getTime();
      const dateB = new Date(b.tanggal_pelayanan).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });
  }

  if (norm.startsWith('SELECT t.registrasi_id, t.pelaksana, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal FROM tindakan_igd t JOIN master_tindakan m ON t.tindakan_id = m.id')) {
    if (!vdb.tindakan_igd) vdb.tindakan_igd = [];
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    return vdb.tindakan_igd.map((t: any) => {
      const m = vdb.master_tindakan.find(mt => mt.id === t.tindakan_id);
      return {
        registrasi_id: t.registrasi_id,
        pelaksana: t.pelaksana,
        nama_tindakan: m ? m.nama_tindakan : 'Tindakan',
        tindakan_keterangan: t.tindakan_keterangan,
        tindakan_tanggal: t.tindakan_tanggal,
        tindakan_jam: t.tindakan_jam,
        tarif_tindakan: Number(t.tarif_tindakan || 0),
        tarif_sarana: Number(t.tarif_sarana || 0),
        tarif_pelayanan: Number(t.tarif_pelayanan || 0),
        tarif_medis: Number(t.tarif_medis || 0),
        jumlah: Number(t.jumlah || 1),
        subtotal: Number(t.subtotal || 0)
      };
    });
  }

  if (norm.startsWith('INSERT INTO registrasi_igd')) {
    const [no_registrasi, pasien_no_rm, tanggal_pelayanan, triase] = params;
    if (!vdb.registrasi_igd) vdb.registrasi_igd = [];
    const newId = vdb.registrasi_igd.length > 0 ? Math.max(...vdb.registrasi_igd.map(x => x.id)) + 1 : 1;
    const record = {
      id: newId,
      no_registrasi,
      pasien_no_rm,
      tanggal_pelayanan,
      triase: triase || 'hijau'
    };
    vdb.registrasi_igd.push(record);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('INSERT INTO tindakan_igd')) {
    let registrasi_id, tindakan_id, pelaksana = null, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal;
    if (params.length === 11) {
      [
        registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    } else {
      [
        registrasi_id, tindakan_id, pelaksana, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    }
    if (!vdb.tindakan_igd) vdb.tindakan_igd = [];
    const newId = vdb.tindakan_igd.length > 0 ? Math.max(...vdb.tindakan_igd.map(x => x.id)) + 1 : 1;
    const action = {
      id: newId,
      registrasi_id: Number(registrasi_id),
      tindakan_id: Number(tindakan_id),
      pelaksana,
      tindakan_keterangan: tindakan_keterangan || '',
      tindakan_tanggal,
      tindakan_jam,
      tarif_tindakan: Number(tarif_tindakan || 0),
      tarif_sarana: Number(tarif_sarana || 0),
      tarif_pelayanan: Number(tarif_pelayanan || 0),
      tarif_medis: Number(tarif_medis || 0),
      jumlah: Number(jumlah || 1),
      subtotal: Number(subtotal || 0)
    };
    vdb.tindakan_igd.push(action);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE registrasi_igd SET')) {
    const id = Number(params[params.length - 1]);
    const pasien_no_rm = params[0];
    const tanggal_pelayanan = params[1];
    const triase = params[2];
    const icd_kode = params.length >= 5 ? params[3] : null;
    const dpjp = params.length >= 6 ? params[4] : null;

    if (!vdb.registrasi_igd) vdb.registrasi_igd = [];
    const idx = vdb.registrasi_igd.findIndex(r => r.id === id);
    if (idx !== -1) {
      vdb.registrasi_igd[idx].pasien_no_rm = pasien_no_rm;
      vdb.registrasi_igd[idx].tanggal_pelayanan = tanggal_pelayanan;
      vdb.registrasi_igd[idx].triase = triase || 'hijau';
      if (icd_kode !== undefined) {
        vdb.registrasi_igd[idx].icd_kode = icd_kode;
      }
      if (dpjp !== undefined) {
        vdb.registrasi_igd[idx].dpjp = dpjp;
      }
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM registrasi_igd WHERE id = ?')) {
    const id = Number(params[0]);
    if (vdb.registrasi_igd) {
      vdb.registrasi_igd = vdb.registrasi_igd.filter(x => x.id !== id);
    }
    if (vdb.tindakan_igd) {
      vdb.tindakan_igd = vdb.tindakan_igd.filter(x => x.registrasi_id !== id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM tindakan_igd WHERE registrasi_id = ?')) {
    const reg_id = Number(params[0]);
    if (vdb.tindakan_igd) {
      vdb.tindakan_igd = vdb.tindakan_igd.filter(x => x.registrasi_id !== reg_id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- RANAP SIMULATION (VIRTUAL DB) ---
  if (norm.startsWith('SELECT r.id, r.no_registrasi, r.pasien_no_rm as no_rm, p.nama as nama_pasien, r.tanggal_pelayanan, r.triase, r.icd_masuk, r.icd_pulang, r.kamar FROM registrasi_ranap r JOIN pasien p ON r.pasien_no_rm = p.no_rm')) {
    if (!vdb.registrasi_ranap) vdb.registrasi_ranap = [];
    if (!vdb.pasien) vdb.pasien = [];
    return vdb.registrasi_ranap.map((r: any) => {
      const p = vdb.pasien.find(pas => String(pas.no_rm).toLowerCase() === String(r.pasien_no_rm).toLowerCase());
      return {
        id: r.id,
        no_registrasi: r.no_registrasi,
        no_rm: r.pasien_no_rm,
        nama_pasien: p ? p.nama : 'Pasien',
        tanggal_pelayanan: r.tanggal_pelayanan,
        triase: r.triase || 'hijau',
        icd_masuk: r.icd_masuk || '',
        icd_pulang: r.icd_pulang || '',
        kamar: r.kamar || ''
      };
    }).sort((a, b) => {
      const dateA = new Date(a.tanggal_pelayanan).getTime();
      const dateB = new Date(b.tanggal_pelayanan).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return b.id - a.id;
    });
  }

  if (norm.startsWith('SELECT t.registrasi_id, t.pelaksana, m.nama_tindakan, t.tindakan_keterangan, t.tindakan_tanggal, t.tindakan_jam, t.tarif_tindakan, t.tarif_sarana, t.tarif_pelayanan, t.tarif_medis, t.jumlah, t.subtotal FROM tindakan_ranap t JOIN master_tindakan m ON t.tindakan_id = m.id')) {
    if (!vdb.tindakan_ranap) vdb.tindakan_ranap = [];
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    return vdb.tindakan_ranap.map((t: any) => {
      const m = vdb.master_tindakan.find(mt => mt.id === t.tindakan_id);
      return {
        registrasi_id: t.registrasi_id,
        pelaksana: t.pelaksana,
        nama_tindakan: m ? m.nama_tindakan : 'Tindakan',
        tindakan_keterangan: t.tindakan_keterangan,
        tindakan_tanggal: t.tindakan_tanggal,
        tindakan_jam: t.tindakan_jam,
        tarif_tindakan: Number(t.tarif_tindakan || 0),
        tarif_sarana: Number(t.tarif_sarana || 0),
        tarif_pelayanan: Number(t.tarif_pelayanan || 0),
        tarif_medis: Number(t.tarif_medis || 0),
        jumlah: Number(t.jumlah || 1),
        subtotal: Number(t.subtotal || 0)
      };
    });
  }

  if (norm.startsWith('INSERT INTO registrasi_ranap')) {
    // INSERT INTO registrasi_ranap (no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, icd_masuk, icd_pulang, kamar) VALUES (?, ?, ?, ?, ?, ?, ?)
    const [no_registrasi, pasien_no_rm, tanggal_pelayanan, triase, icd_masuk, icd_pulang, kamar] = params;
    if (!vdb.registrasi_ranap) vdb.registrasi_ranap = [];
    
    // Check duplication
    const dup = vdb.registrasi_ranap.some(x => String(x.no_registrasi).toLowerCase() === String(no_registrasi).toLowerCase());
    if (dup) {
      const err: any = new Error(`Duplicate entry '${no_registrasi}' for key 'no_registrasi'`);
      err.code = 'ER_DUP_ENTRY';
      throw err;
    }

    const newId = vdb.registrasi_ranap.length > 0 ? Math.max(...vdb.registrasi_ranap.map(x => x.id)) + 1 : 1;
    const record = {
      id: newId,
      no_registrasi,
      pasien_no_rm,
      tanggal_pelayanan,
      triase: triase || 'hijau',
      icd_masuk: icd_masuk || '',
      icd_pulang: icd_pulang || '',
      kamar: kamar || ''
    };
    vdb.registrasi_ranap.push(record);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('INSERT INTO tindakan_ranap')) {
    let registrasi_id, tindakan_id, pelaksana = null, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal;
    if (params.length === 11) {
      [
        registrasi_id, tindakan_id, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    } else {
      [
        registrasi_id, tindakan_id, pelaksana, tindakan_keterangan, tindakan_tanggal, tindakan_jam,
        tarif_tindakan, tarif_sarana, tarif_pelayanan, tarif_medis, jumlah, subtotal
      ] = params;
    }
    if (!vdb.tindakan_ranap) vdb.tindakan_ranap = [];
    const newId = vdb.tindakan_ranap.length > 0 ? Math.max(...vdb.tindakan_ranap.map(x => x.id)) + 1 : 1;
    const action = {
      id: newId,
      registrasi_id: Number(registrasi_id),
      tindakan_id: Number(tindakan_id),
      pelaksana,
      tindakan_keterangan: tindakan_keterangan || '',
      tindakan_tanggal,
      tindakan_jam,
      tarif_tindakan: Number(tarif_tindakan || 0),
      tarif_sarana: Number(tarif_sarana || 0),
      tarif_pelayanan: Number(tarif_pelayanan || 0),
      tarif_medis: Number(tarif_medis || 0),
      jumlah: Number(jumlah || 1),
      subtotal: Number(subtotal || 0)
    };
    vdb.tindakan_ranap.push(action);
    writeVirtualDb(vdb);
    return { insertId: newId, affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE registrasi_ranap SET')) {
    const id = Number(params[params.length - 1]);
    const pasien_no_rm = params[0];
    const tanggal_pelayanan = params[1];
    const triase = params[2];
    const icd_masuk = params[3];
    const icd_pulang = params[4];
    const kamar = params[5];
    const dpjp = params.length >= 8 ? params[6] : null;

    if (!vdb.registrasi_ranap) vdb.registrasi_ranap = [];
    const idx = vdb.registrasi_ranap.findIndex(r => r.id === id);
    if (idx !== -1) {
      vdb.registrasi_ranap[idx].pasien_no_rm = pasien_no_rm;
      vdb.registrasi_ranap[idx].tanggal_pelayanan = tanggal_pelayanan;
      vdb.registrasi_ranap[idx].triase = triase || 'hijau';
      vdb.registrasi_ranap[idx].icd_masuk = icd_masuk || '';
      vdb.registrasi_ranap[idx].icd_pulang = icd_pulang || '';
      vdb.registrasi_ranap[idx].kamar = kamar || '';
      if (dpjp !== undefined) {
        vdb.registrasi_ranap[idx].dpjp = dpjp;
      }
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM registrasi_ranap WHERE id = ?')) {
    const id = Number(params[0]);
    if (vdb.registrasi_ranap) {
      vdb.registrasi_ranap = vdb.registrasi_ranap.filter(x => x.id !== id);
    }
    if (vdb.tindakan_ranap) {
      vdb.tindakan_ranap = vdb.tindakan_ranap.filter(x => x.registrasi_id !== id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('DELETE FROM tindakan_ranap WHERE registrasi_id = ?')) {
    const reg_id = Number(params[0]);
    if (vdb.tindakan_ranap) {
      vdb.tindakan_ranap = vdb.tindakan_ranap.filter(x => x.registrasi_id !== reg_id);
    }
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  if (norm.startsWith('UPDATE pasien SET nama = ? WHERE no_rm = ?')) {
    const [nama, no_rm] = params;
    if (!vdb.pasien) vdb.pasien = [];
    const idx = vdb.pasien.findIndex(p => String(p.no_rm).toLowerCase() === String(no_rm).toLowerCase());
    if (idx !== -1) {
      vdb.pasien[idx].nama = String(nama);
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM pasien WHERE no_rm = ?')) {
    const no_rm = params[0];
    if (!vdb.pasien) vdb.pasien = [];
    vdb.pasien = vdb.pasien.filter(p => String(p.no_rm).toLowerCase() !== String(no_rm).toLowerCase());
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- 8.6 MASTER TINDAKAN (VIRTUAL DB) ---
  if (norm.startsWith('SELECT * FROM master_tindakan')) {
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    return vdb.master_tindakan;
  }

  if (norm.startsWith('SELECT id FROM master_tindakan WHERE nama_tindakan = ?')) {
    const term = String(params[0]).toLowerCase();
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    const item = vdb.master_tindakan.find(t => t.nama_tindakan.toLowerCase() === term);
    return item ? [item] : [];
  }

  if (norm.startsWith('INSERT INTO master_tindakan')) {
    // INSERT INTO master_tindakan (nama_tindakan, jenis) VALUES (?, ?)
    const nama_tindakan = params[0];
    const jenis = params[1] || 'RALAN';
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    const exists = vdb.master_tindakan.some(t => t.nama_tindakan.toLowerCase() === String(nama_tindakan).toLowerCase());
    if (!exists) {
      const newId = vdb.master_tindakan.length > 0 ? Math.max(...vdb.master_tindakan.map(t => t.id)) + 1 : 1;
      vdb.master_tindakan.push({ id: newId, nama_tindakan: String(nama_tindakan), jenis: String(jenis) });
      writeVirtualDb(vdb);
      return { insertId: newId, affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('UPDATE master_tindakan SET nama_tindakan = ?, jenis = ? WHERE id = ?')) {
    const [nama, jenis, id] = params;
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    const idx = vdb.master_tindakan.findIndex(t => t.id === Number(id));
    if (idx !== -1) {
      vdb.master_tindakan[idx].nama_tindakan = String(nama);
      vdb.master_tindakan[idx].jenis = String(jenis);
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('DELETE FROM master_tindakan WHERE id = ?')) {
    const id = Number(params[0]);
    if (!vdb.master_tindakan) vdb.master_tindakan = [];
    vdb.master_tindakan = vdb.master_tindakan.filter(t => t.id !== id);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }

  // --- ICD-10 MASTER SIMULATION ---
  if (norm.startsWith('SELECT * FROM master_icd10')) {
    if (!vdb.master_icd10) vdb.master_icd10 = [];
    return vdb.master_icd10;
  }

  if (norm.startsWith('INSERT INTO master_icd10') || norm.startsWith('INSERT IGNORE INTO master_icd10')) {
    const kode_icd = params[0];
    const deskripsi = params[1];
    if (!vdb.master_icd10) vdb.master_icd10 = [];
    const exists = vdb.master_icd10.some(item => item.kode_icd.toLowerCase() === String(kode_icd).toLowerCase());
    if (!exists) {
      const newId = vdb.master_icd10.length > 0 ? Math.max(...vdb.master_icd10.map(item => item.id)) + 1 : 1;
      vdb.master_icd10.push({ id: newId, kode_icd: String(kode_icd).toUpperCase(), deskripsi: String(deskripsi) });
      writeVirtualDb(vdb);
      return { insertId: newId, affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  if (norm.startsWith('UPDATE master_icd10 SET')) {
    const [kode_icd, deskripsi, id] = params;
    if (!vdb.master_icd10) vdb.master_icd10 = [];
    const idx = vdb.master_icd10.findIndex(item => item.id === Number(id));
    if (idx !== -1) {
      vdb.master_icd10[idx].kode_icd = String(kode_icd).toUpperCase();
      vdb.master_icd10[idx].deskripsi = String(deskripsi);
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }

  // Fallback defaults for unrecognized queries
  console.log('Unrecognized virtual query fallback simulation:', sqlText.substring(0, 80));
  return [];
}
