-- Blueprint Database Klinik Puri Medika --
-- Database: klinik_puri_medika

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'lab', 'farmasi') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lab_parameter (
  id INT NOT NULL AUTO_INCREMENT,
  kategori VARCHAR(50) NOT NULL,
  nama_parameter VARCHAR(150) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lab_data_bulanan (
  id INT NOT NULL AUTO_INCREMENT,
  parameter_id INT NOT NULL,
  bulan TINYINT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  jumlah INT NOT NULL DEFAULT 0,
  input_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (parameter_id) REFERENCES lab_parameter(id) ON DELETE CASCADE,
  FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_param_bulan_tahun (parameter_id, bulan, tahun)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lab_data_harian (
  id INT NOT NULL AUTO_INCREMENT,
  parameter_id INT NOT NULL,
  tanggal DATE NOT NULL,
  jumlah INT NOT NULL DEFAULT 0,
  input_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (parameter_id) REFERENCES lab_parameter(id) ON DELETE CASCADE,
  FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_param_tanggal (parameter_id, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obat_master (
  id INT NOT NULL AUTO_INCREMENT,
  kode_obat VARCHAR(20) NOT NULL UNIQUE,
  nama_obat VARCHAR(200) NOT NULL,
  golongan VARCHAR(50) DEFAULT 'Obat Bebas',
  satuan VARCHAR(20) NOT NULL,
  kemasan VARCHAR(50) NOT NULL,
  harga_satuan DECIMAL(12,2) DEFAULT 0.00,
  lead_time_hari INT DEFAULT 2,
  safety_stock INT DEFAULT 0,
  stok_minimum INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obat_konsumsi_bulanan (
  id INT NOT NULL AUTO_INCREMENT,
  obat_id INT NOT NULL,
  bulan TINYINT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  stok_awal INT NOT NULL DEFAULT 0,
  penerimaan INT NOT NULL DEFAULT 0,
  pemakaian INT NOT NULL DEFAULT 0,
  retur_hilang INT NOT NULL DEFAULT 0,
  sisa_stok INT NOT NULL,
  input_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (obat_id) REFERENCES obat_master(id) ON DELETE CASCADE,
  FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_obat_bulan_tahun (obat_id, bulan, tahun)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obat_konsumsi_harian (
  id INT NOT NULL AUTO_INCREMENT,
  obat_id INT NOT NULL,
  tanggal DATE NOT NULL,
  stok_awal INT NOT NULL DEFAULT 0,
  penerimaan INT NOT NULL DEFAULT 0,
  pemakaian INT NOT NULL DEFAULT 0,
  retur_hilang INT NOT NULL DEFAULT 0,
  sisa_stok INT NOT NULL,
  input_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (obat_id) REFERENCES obat_master(id) ON DELETE CASCADE,
  FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_obat_tanggal (obat_id, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS obat_forecasting (
  id INT NOT NULL AUTO_INCREMENT,
  obat_id INT NOT NULL,
  bulan_proyeksi TINYINT NOT NULL,
  tahun_proyeksi INT NOT NULL,
  proyeksi_kebutuhan INT NOT NULL,
  reorder_qty INT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (obat_id) REFERENCES obat_master(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Default users (passwords are bcrypt hashes of: 'admin123', 'lab123', 'farmasi123')
INSERT INTO users (nama, email, password_hash, role) VALUES
('Administrator Puri Medika', 'admin@clinic.com', '$2a$10$iI0T7XF7vDbe.n89eWw6ZuoVb1AAnqJ8.8VzKxU1Hw6WzN48rQ44q', 'admin')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO users (nama, email, password_hash, role) VALUES
('Petugas Laboratorium', 'lab@clinic.com', '$2a$10$o6mOnS4eHhB2Yf80W2Ie8OfKmsidb4.aZ3Q1zP8zPvx/1z.q8V8u2', 'lab')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO users (nama, email, password_hash, role) VALUES
('Apoteker Farmasi', 'farmasi@clinic.com', '$2a$10$MscvHox6K3G4WjJjM.sEAu.KIn1nZt.Y5C0p2I9CDeF0p3sI4Gz2a', 'farmasi')
ON DUPLICATE KEY UPDATE id=id;

-- Seed Lab Parameters
INSERT INTO lab_parameter (kategori, nama_parameter, is_active) VALUES
('HEMATOLOGI', 'Hemoglobin (Hb)', 1),
('HEMATOLOGI', 'Leukosit', 1),
('HEMATOLOGI', 'Trombosit', 1),
('HEMATOLOGI', 'Eritrosit', 1),
('KIMIA DARAH', 'Glukosa Sewaktu', 1),
('KIMIA DARAH', 'Kolesterol Total', 1),
('KIMIA DARAH', 'Asam Urat', 1),
('KIMIA DARAH', 'Ureum', 1),
('KIMIA DARAH', 'Kreatinin', 1),
('KIMIA DARAH', 'SGOT', 1),
('KIMIA DARAH', 'SGPT', 1),
('IMUNOSEROLOGI', 'Widal', 1),
('IMUNOSEROLOGI', 'HBsAg', 1),
('URINALISIS', 'Urin Lengkap', 1)
ON DUPLICATE KEY UPDATE id=id;

-- Seed Obat Master data
INSERT INTO obat_master (kode_obat, nama_obat, golongan, satuan, kemasan, harga_satuan, lead_time_hari, is_active) VALUES
('OBT-PAR1', 'Paracetamol 500mg', 'Tablet Bebas', 'Tablet', 'DUS / 10 Strips', 250.00, 2, 1),
('OBT-AMO2', 'Amoxicillin 500mg', 'Antibiotik Keras', 'Kaplet', 'DUS / 10 strips', 600.00, 3, 1),
('OBT-MET3', 'Metformin 500mg', 'Obat Keras', 'Tablet', 'DUS / 10 strips', 350.00, 2, 1),
('OBT-AML4', 'Amlodipine 5mg', 'Obat Keras', 'Tablet', 'DUS / 10 strips', 400.00, 2, 1),
('OBT-CFX5', 'Cefadroxil 500mg', 'Antibiotik Keras', 'Kapsul', 'DUS / 10 strips', 1200.00, 4, 1),
('OBT-DVY6', 'Dexamethasone 0.5mg', 'Obat Keras', 'Tablet', 'Botol / 1000 pcs', 150.00, 2, 1),
('OBT-MEC7', 'Mecobalamin 500mcg', 'Vitamin', 'Kapsul', 'DUS / 10 strips', 800.00, 2, 1),
('OBT-OBH8', 'OBH Sirup 100ml', 'Sirup Bebas', 'Botol', 'Btl 100ml', 15000.00, 2, 1),
('OBT-OMP9', 'Omeprazole 20mg', 'Obat Keras', 'Kapsul', 'DUS / 3 strips', 500.00, 2, 1),
('OBT-CTC10', 'Cetirizine 10mg', 'Obat Bebas Terbatas', 'Tablet', 'DUS / 10 strips', 300.00, 2, 1),
('OBT-IBP11', 'Ibuprofen 400mg', 'Obat Bebas Terbatas', 'Tablet', 'DUS / 10 strips', 450.00, 2, 1),
('OBT-MFS12', 'Mefenamic Acid 500mg', 'Obat Keras', 'Tablet', 'DUS / 10 strips', 500.00, 2, 1),
('OBT-SLB13', 'Salbutamol 2mg', 'Obat Keras', 'Tablet', 'DUS / 10 strips', 200.00, 2, 1),
('OBT-SIM14', 'Simvastatin 20mg', 'Obat Keras', 'Tablet', 'DUS / 10 strips', 700.00, 2, 1),
('OBT-VCG15', 'Vitamin C 500mg', 'Vitamin', 'Tablet', 'DUS / 10 strips', 200.00, 1, 1)
ON DUPLICATE KEY UPDATE id=id;
