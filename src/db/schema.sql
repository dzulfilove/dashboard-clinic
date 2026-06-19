-- Blueprint Database Klinik Puri Medika --
-- Database: klinik_puri_medika

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

-- Pelayanan Rawat Jalan (Old)
CREATE TABLE IF NOT EXISTS pelayanan_rawat_jalan (
  id INT NOT NULL AUTO_INCREMENT,
  no_registrasi VARCHAR(50) NOT NULL UNIQUE,
  no_rm VARCHAR(20) NOT NULL,
  nama_pasien VARCHAR(150) NOT NULL,
  tanggal_pelayanan DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pelayanan Rawat Jalan Tindakan (Old)
CREATE TABLE IF NOT EXISTS pelayanan_rawat_jalan_tindakan (
  id INT NOT NULL AUTO_INCREMENT,
  rawat_jalan_id INT NOT NULL,
  pelaksana VARCHAR(150) NOT NULL,
  tindakan_nama VARCHAR(250) NOT NULL,
  tindakan_keterangan TEXT,
  tindakan_tanggal DATE NOT NULL,
  tindakan_jam TIME NOT NULL,
  tarif_tindakan DECIMAL(12,2) DEFAULT 0.00,
  tarif_sarana DECIMAL(12,2) DEFAULT 0.00,
  tarif_pelayanan DECIMAL(12,2) DEFAULT 0.00,
  tarif_medis DECIMAL(12,2) DEFAULT 0.00,
  jumlah INT NOT NULL DEFAULT 1,
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (rawat_jalan_id) REFERENCES pelayanan_rawat_jalan(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Normalized Tables (New)
CREATE TABLE IF NOT EXISTS pasien (
  no_rm VARCHAR(20) NOT NULL PRIMARY KEY,
  nama VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_icd10 (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_icd VARCHAR(20) NOT NULL UNIQUE,
  deskripsi VARCHAR(250) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registrasi_rawat_jalan (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_registrasi VARCHAR(50) NOT NULL UNIQUE,
  pasien_no_rm VARCHAR(20) NOT NULL,
  tanggal_pelayanan DATE NOT NULL,
  triase VARCHAR(20) DEFAULT 'hijau',
  unit VARCHAR(50) NOT NULL DEFAULT 'Poli Umum',
  icd_kode VARCHAR(20),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm),
  FOREIGN KEY (icd_kode) REFERENCES master_icd10(kode_icd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_tindakan (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama_tindakan VARCHAR(250) NOT NULL UNIQUE,
  jenis ENUM('RALAN', 'RANAP') NOT NULL DEFAULT 'RALAN'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tindakan_rawat_jalan (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registrasi_id INT NOT NULL,
  tindakan_id INT NOT NULL,
  pelaksana VARCHAR(150),
  tindakan_keterangan TEXT,
  tindakan_tanggal DATE,
  tindakan_jam TIME,
  tarif_tindakan DECIMAL(12,2),
  tarif_sarana DECIMAL(12,2),
  tarif_pelayanan DECIMAL(12,2),
  tarif_medis DECIMAL(12,2),
  jumlah INT,
  subtotal DECIMAL(12,2),
  FOREIGN KEY (registrasi_id) REFERENCES registrasi_rawat_jalan(id) ON DELETE CASCADE,
  FOREIGN KEY (tindakan_id) REFERENCES master_tindakan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registrasi_igd (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_registrasi VARCHAR(50) NOT NULL UNIQUE,
  pasien_no_rm VARCHAR(20) NOT NULL,
  tanggal_pelayanan DATE NOT NULL,
  triase VARCHAR(20) DEFAULT 'hijau',
  icd_kode VARCHAR(20),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm),
  FOREIGN KEY (icd_kode) REFERENCES master_icd10(kode_icd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tindakan_igd (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registrasi_id INT NOT NULL,
  tindakan_id INT NOT NULL,
  pelaksana VARCHAR(150),
  tindakan_keterangan TEXT,
  tindakan_tanggal DATE,
  tindakan_jam TIME,
  tarif_tindakan DECIMAL(12,2),
  tarif_sarana DECIMAL(12,2),
  tarif_pelayanan DECIMAL(12,2),
  tarif_medis DECIMAL(12,2),
  jumlah INT,
  subtotal DECIMAL(12,2),
  FOREIGN KEY (registrasi_id) REFERENCES registrasi_igd(id) ON DELETE CASCADE,
  FOREIGN KEY (tindakan_id) REFERENCES master_tindakan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS registrasi_ranap (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_registrasi VARCHAR(50) NOT NULL UNIQUE,
  pasien_no_rm VARCHAR(20) NOT NULL,
  tanggal_pelayanan DATE NOT NULL,
  triase VARCHAR(20) DEFAULT 'hijau',
  icd_masuk VARCHAR(20),
  icd_pulang VARCHAR(20),
  kamar VARCHAR(100),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm),
  FOREIGN KEY (icd_masuk) REFERENCES master_icd10(kode_icd),
  FOREIGN KEY (icd_pulang) REFERENCES master_icd10(kode_icd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tindakan_ranap (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registrasi_id INT NOT NULL,
  tindakan_id INT NOT NULL,
  pelaksana VARCHAR(150),
  tindakan_keterangan TEXT,
  tindakan_tanggal DATE,
  tindakan_jam TIME,
  tarif_tindakan DECIMAL(12,2),
  tarif_sarana DECIMAL(12,2),
  tarif_pelayanan DECIMAL(12,2),
  tarif_medis DECIMAL(12,2),
  jumlah INT,
  subtotal DECIMAL(12,2),
  FOREIGN KEY (registrasi_id) REFERENCES registrasi_ranap(id) ON DELETE CASCADE,
  FOREIGN KEY (tindakan_id) REFERENCES master_tindakan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


