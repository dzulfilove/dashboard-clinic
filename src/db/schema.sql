-- Blueprint Database Klinik Puri Medika --
-- Database: klinik_puri_medika

CREATE TABLE IF NOT EXISTS lab_kategori (
  id INT NOT NULL AUTO_INCREMENT,
  nama_kategori VARCHAR(50) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lab_parameter (
  id INT NOT NULL AUTO_INCREMENT,
  kategori VARCHAR(100) DEFAULT '',
  kategori_id INT,
  nama_parameter VARCHAR(150) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (kategori_id) REFERENCES lab_kategori(id)
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
  saldo_awal_tahun INT DEFAULT NULL,
  saldo_awal_bulan TINYINT DEFAULT NULL,
  saldo_awal_nilai INT DEFAULT 0,
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

-- Seed Lab Kategori
INSERT INTO lab_kategori (nama_kategori, is_active) VALUES
('HEMATOLOGI', 1),
('KIMIA DARAH', 1),
('IMUNOSEROLOGI', 1),
('URINALISIS', 1)
ON DUPLICATE KEY UPDATE id=id;

-- Seed Lab Parameters
INSERT INTO lab_parameter (kategori_id, kategori, nama_parameter, is_active) VALUES
((SELECT id FROM lab_kategori WHERE nama_kategori = 'HEMATOLOGI'), 'HEMATOLOGI', 'Hemoglobin (Hb)', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'HEMATOLOGI'), 'HEMATOLOGI', 'Leukosit', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'HEMATOLOGI'), 'HEMATOLOGI', 'Trombosit', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'HEMATOLOGI'), 'HEMATOLOGI', 'Eritrosit', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'Glukosa Sewaktu', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'Kolesterol Total', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'Asam Urat', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'Ureum', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'Kreatinin', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'SGOT', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'KIMIA DARAH'), 'KIMIA DARAH', 'SGPT', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'IMUNOSEROLOGI'), 'IMUNOSEROLOGI', 'Widal', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'IMUNOSEROLOGI'), 'IMUNOSEROLOGI', 'HBsAg', 1),
((SELECT id FROM lab_kategori WHERE nama_kategori = 'URINALISIS'), 'URINALISIS', 'Urin Lengkap', 1)
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
CREATE TABLE IF NOT EXISTS kota (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama VARCHAR(100) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kecamatan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kota_id INT,
  nama VARCHAR(100) NOT NULL,
  FOREIGN KEY (kota_id) REFERENCES kota(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kelurahan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  kecamatan_id INT,
  nama VARCHAR(100) NOT NULL,
  FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pasien (
  no_rm VARCHAR(20) NOT NULL PRIMARY KEY,
  nik VARCHAR(20) DEFAULT NULL,
  nama VARCHAR(150) NOT NULL,
  tanggal_lahir DATE,
  alamat VARCHAR(255),
  jenis_kelamin ENUM('L', 'P'),
  kelurahan_id INT,
  kecamatan_id INT,
  kota_id INT,
  no_telp VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (kelurahan_id) REFERENCES kelurahan(id),
  FOREIGN KEY (kecamatan_id) REFERENCES kecamatan(id),
  FOREIGN KEY (kota_id) REFERENCES kota(id)
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
  dpjp VARCHAR(250),
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
  dpjp VARCHAR(250),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tindakan_igd (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registrasi_id INT NOT NULL,
  tindakan_id INT NOT NULL,
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
  dpjp VARCHAR(250),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm),
  FOREIGN KEY (icd_masuk) REFERENCES master_icd10(kode_icd),
  FOREIGN KEY (icd_pulang) REFERENCES master_icd10(kode_icd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tindakan_ranap (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  registrasi_id INT NOT NULL,
  tindakan_id INT NOT NULL,
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

CREATE TABLE IF NOT EXISTS dokter (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama_dokter VARCHAR(250) NOT NULL,
  status ENUM('aktif', 'non-aktif', 'nonaktif') DEFAULT 'aktif',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  spesialisasi_unit TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_logs (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  module_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS followup_vaksin (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_order VARCHAR(50) DEFAULT NULL,
  unit_kunjungan VARCHAR(100) DEFAULT NULL,
  pasien_no_rm VARCHAR(50) DEFAULT NULL,
  pasien_nama VARCHAR(250) DEFAULT NULL,
  usia INT DEFAULT NULL,
  kunjungan_terakhir DATE DEFAULT NULL,
  tanggal_rencana DATE DEFAULT NULL,
  rencana_kunjungan_ke INT DEFAULT NULL,
  diagnosa_keluhan TEXT DEFAULT NULL,
  status_rencana VARCHAR(50) DEFAULT NULL,
  catatan_hasil TEXT DEFAULT NULL,
  paket_vaksin VARCHAR(150) DEFAULT NULL,
  rencana_tindakan VARCHAR(250) DEFAULT NULL,
  jumlah_pemeriksaan INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pasien_loyal (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pasien_no_rm VARCHAR(20) NOT NULL UNIQUE,
  pasien_nama VARCHAR(150),
  no_telp VARCHAR(20) DEFAULT NULL,
  total_kunjungan_snapshot INT DEFAULT 0,
  catatan TEXT DEFAULT NULL,
  status ENUM('aktif','nonaktif') DEFAULT 'aktif',
  ditetapkan_oleh INT DEFAULT NULL,
  tanggal_ditetapkan TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pasien_loyal_pesan (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pasien_no_rm VARCHAR(20) NOT NULL,
  no_telp VARCHAR(20),
  message TEXT,
  status ENUM('terkirim','gagal') DEFAULT 'terkirim',
  waha_response TEXT DEFAULT NULL,
  sent_by INT DEFAULT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS shift_dokter (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama_shift VARCHAR(100) NOT NULL,
  jam_mulai VARCHAR(10) NOT NULL,
  jam_selesai VARCHAR(10) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS jadwal_dokter (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  shift_id INT NOT NULL,
  dokter_id INT NOT NULL,
  keterangan TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES shift_dokter(id) ON DELETE CASCADE,
  FOREIGN KEY (dokter_id) REFERENCES dokter(id) ON DELETE CASCADE,
  UNIQUE KEY unique_tanggal_shift_dokter (tanggal, shift_id, dokter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lab_pemeriksaan_pasien (
  id INT NOT NULL AUTO_INCREMENT,
  no_registrasi VARCHAR(50) NOT NULL,
  parameter_id INT NOT NULL,
  pasien_no_rm VARCHAR(20) NOT NULL,
  pasien_nik VARCHAR(20) DEFAULT NULL,
  pasien_nama VARCHAR(150) NOT NULL,
  dpjp VARCHAR(250) DEFAULT NULL,
  tanggal_pemeriksaan DATE NOT NULL,
  input_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_reg_param (no_registrasi, parameter_id),
  FOREIGN KEY (parameter_id) REFERENCES lab_parameter(id) ON DELETE CASCADE,
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tagihan_pasien (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no_registrasi VARCHAR(50) NOT NULL UNIQUE,
  pasien_no_rm VARCHAR(20) DEFAULT NULL,
  registrasi_rj_id INT DEFAULT NULL,
  registrasi_igd_id INT DEFAULT NULL,
  registrasi_ranap_id INT DEFAULT NULL,
  nama_pasien VARCHAR(150) DEFAULT NULL,
  unit VARCHAR(150) DEFAULT NULL,
  penanggung VARCHAR(100) DEFAULT NULL,
  dokter VARCHAR(250) DEFAULT NULL,
  tarif_pendaftaran DECIMAL(15,2) NOT NULL DEFAULT 0,
  kartu_pasien DECIMAL(15,2) NOT NULL DEFAULT 0,
  konsultasi DECIMAL(15,2) NOT NULL DEFAULT 0,
  tindakan DECIMAL(15,2) NOT NULL DEFAULT 0,
  penunjang DECIMAL(15,2) NOT NULL DEFAULT 0,
  farmasi DECIMAL(15,2) NOT NULL DEFAULT 0,
  bhp DECIMAL(15,2) NOT NULL DEFAULT 0,
  lain_lain DECIMAL(15,2) NOT NULL DEFAULT 0,
  potongan DECIMAL(15,2) NOT NULL DEFAULT 0,
  tagihan DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tagihan_rm (pasien_no_rm),
  FOREIGN KEY (pasien_no_rm) REFERENCES pasien(no_rm) ON DELETE SET NULL,
  FOREIGN KEY (registrasi_rj_id) REFERENCES registrasi_rawat_jalan(id) ON DELETE SET NULL,
  FOREIGN KEY (registrasi_igd_id) REFERENCES registrasi_igd(id) ON DELETE SET NULL,
  FOREIGN KEY (registrasi_ranap_id) REFERENCES registrasi_ranap(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============ MODUL MUTU & INDIKATOR (tabel pendukung) ============
CREATE TABLE IF NOT EXISTS mutu_indikator (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  kategori VARCHAR(40) NOT NULL DEFAULT 'Nasional',
  satuan VARCHAR(20) NOT NULL DEFAULT '%',
  cara_hitung ENUM('rasio','rate_per_seribu','angka','rata_rata','waktu') NOT NULL DEFAULT 'rasio',
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mutu_indikator_kode (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_indikator_versi (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  indikator_id INT NOT NULL,
  berlaku_dari DATE NOT NULL,
  definisi_numerator VARCHAR(255) NOT NULL,
  definisi_denominator VARCHAR(255) NOT NULL,
  target DECIMAL(12,4) NULL,
  target_tipe ENUM('min','max','sama') NOT NULL DEFAULT 'min',
  metode_observasi VARCHAR(150) NULL,
  catatan TEXT NULL,
  dibuat_oleh VARCHAR(150) NULL,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mutu_versi (indikator_id, berlaku_dari),
  CONSTRAINT fk_mv_indikator FOREIGN KEY (indikator_id) REFERENCES mutu_indikator(id),
  CONSTRAINT ck_mv_target CHECK (target IS NULL OR target >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_unit_indikator (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_kode VARCHAR(20) NOT NULL,
  indikator_id INT NOT NULL,
  berlaku_dari DATE NOT NULL,
  berlaku_sampai DATE NULL,
  urutan INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_mutu_unit_indikator (unit_kode, indikator_id, berlaku_dari),
  CONSTRAINT fk_mui_indikator FOREIGN KEY (indikator_id) REFERENCES mutu_indikator(id),
  CONSTRAINT ck_mui_rentang CHECK (berlaku_sampai IS NULL OR berlaku_sampai >= berlaku_dari)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_pengukuran (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_kode VARCHAR(20) NOT NULL,
  indikator_id INT NOT NULL,
  tanggal DATE NOT NULL,
  numerator DECIMAL(12,4) NULL,
  denominator DECIMAL(12,4) NULL,
  nilai DECIMAL(12,4) NULL,
  status ENUM('draf','final','dikoreksi') NOT NULL DEFAULT 'final',
  sumber ENUM('manual','otomatis') NOT NULL DEFAULT 'manual',
  catatan VARCHAR(255) NULL,
  dicatat_oleh VARCHAR(150) NULL,
  dicatat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  divalidasi_oleh VARCHAR(150) NULL,
  divalidasi_pada TIMESTAMP NULL,
  UNIQUE KEY uq_mutu_pengukuran (unit_kode, indikator_id, tanggal),
  KEY idx_mp_indikator_tanggal (indikator_id, tanggal),
  CONSTRAINT fk_mp_indikator FOREIGN KEY (indikator_id) REFERENCES mutu_indikator(id),
  CONSTRAINT ck_mp_n CHECK (numerator IS NULL OR numerator >= 0),
  CONSTRAINT ck_mp_d CHECK (denominator IS NULL OR denominator >= 0),
  CONSTRAINT ck_mp_n_le_d CHECK (numerator IS NULL OR denominator IS NULL OR numerator <= denominator),
  CONSTRAINT ck_mp_bentuk CHECK ((numerator IS NULL AND denominator IS NULL AND nilai IS NOT NULL)
                              OR (numerator IS NOT NULL AND denominator IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_pengukuran_revisi (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pengukuran_id INT NOT NULL,
  numerator_lama DECIMAL(12,4) NULL,
  denominator_lama DECIMAL(12,4) NULL,
  nilai_lama DECIMAL(12,4) NULL,
  numerator_baru DECIMAL(12,4) NULL,
  denominator_baru DECIMAL(12,4) NULL,
  nilai_baru DECIMAL(12,4) NULL,
  alasan VARCHAR(255) NOT NULL,
  diubah_oleh VARCHAR(150) NULL,
  diubah_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_mpr_pengukuran (pengukuran_id),
  CONSTRAINT fk_mpr_pengukuran FOREIGN KEY (pengukuran_id) REFERENCES mutu_pengukuran(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_aturan_validasi (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  keterangan TEXT NULL,
  tingkat ENUM('tolak','tanda') NOT NULL DEFAULT 'tanda',
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_mutu_aturan (kode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_pengukuran_anomali (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  pengukuran_id INT NOT NULL,
  aturan_id INT NOT NULL,
  keterangan VARCHAR(255) NULL,
  status ENUM('terbuka','diterima','diabaikan') NOT NULL DEFAULT 'terbuka',
  diputuskan_oleh VARCHAR(150) NULL,
  diputuskan_pada TIMESTAMP NULL,
  alasan_keputusan VARCHAR(255) NULL,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mutu_anomali (pengukuran_id, aturan_id),
  CONSTRAINT fk_ma_pengukuran FOREIGN KEY (pengukuran_id) REFERENCES mutu_pengukuran(id) ON DELETE CASCADE,
  CONSTRAINT fk_ma_aturan FOREIGN KEY (aturan_id) REFERENCES mutu_aturan_validasi(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_periode (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_kode VARCHAR(20) NOT NULL,
  tahun SMALLINT NOT NULL,
  bulan TINYINT NOT NULL,
  status ENUM('terbuka','tertutup','terkunci') NOT NULL DEFAULT 'terbuka',
  catatan TEXT NULL,
  ditutup_oleh VARCHAR(150) NULL,
  ditutup_pada TIMESTAMP NULL,
  dikunci_oleh VARCHAR(150) NULL,
  dikunci_pada TIMESTAMP NULL,
  UNIQUE KEY uq_mutu_periode (unit_kode, tahun, bulan),
  CONSTRAINT ck_mup_bulan CHECK (bulan BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_analisa (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  periode_id INT NOT NULL,
  indikator_id INT NOT NULL,
  narasi TEXT NULL,
  rencana TEXT NULL,
  status ENUM('draf','menunggu_persetujuan','disetujui') NOT NULL DEFAULT 'draf',
  disetujui_oleh VARCHAR(150) NULL,
  disetujui_pada TIMESTAMP NULL,
  diperbarui_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mutu_analisa (periode_id, indikator_id),
  CONSTRAINT fk_man_periode FOREIGN KEY (periode_id) REFERENCES mutu_periode(id) ON DELETE CASCADE,
  CONSTRAINT fk_man_indikator FOREIGN KEY (indikator_id) REFERENCES mutu_indikator(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_tindak_lanjut (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  analisa_id INT NOT NULL,
  uraian TEXT NOT NULL,
  pic_nama VARCHAR(150) NULL,
  tenggat DATE NULL,
  status ENUM('direncanakan','berjalan','selesai','batal') NOT NULL DEFAULT 'direncanakan',
  realisasi TEXT NULL,
  hasil_evaluasi ENUM('berhasil','tidak_berhasil','belum_terlaksana') NULL,
  dievaluasi_pada_periode_id INT NULL,
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ditutup_pada TIMESTAMP NULL,
  KEY idx_mtl_analisa (analisa_id),
  KEY idx_mtl_status_tenggat (status, tenggat),
  CONSTRAINT fk_mtl_analisa FOREIGN KEY (analisa_id) REFERENCES mutu_analisa(id) ON DELETE CASCADE,
  CONSTRAINT fk_mtl_evaluasi FOREIGN KEY (dievaluasi_pada_periode_id) REFERENCES mutu_periode(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mutu_hari_libur (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_kode VARCHAR(20) NULL,
  tanggal DATE NOT NULL,
  keterangan VARCHAR(100) NULL,
  UNIQUE KEY uq_mutu_libur (unit_kode, tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO mutu_aturan_validasi (kode, nama, keterangan, tingkat) VALUES ('N_GT_D', 'Numerator melebihi denominator', 'Untuk indikator kepatuhan ini tidak mungkin dan biasanya berarti definisi penyebut salah.', 'tolak');
INSERT IGNORE INTO mutu_aturan_validasi (kode, nama, keterangan, tingkat) VALUES ('RASIO_GT_100', 'Capaian di atas 100 persen', 'Disimpan tetapi wajib ditinjau sebelum periode dikunci.', 'tanda');
INSERT IGNORE INTO mutu_aturan_validasi (kode, nama, keterangan, tingkat) VALUES ('D_KONSTAN', 'Penyebut sama berulang', 'Penyebut identik 7 hari berturut-turut, biasanya angka disalin bukan diukur.', 'tanda');
INSERT IGNORE INTO mutu_aturan_validasi (kode, nama, keterangan, tingkat) VALUES ('HARI_KOSONG', 'Hari efektif tidak terisi', 'Mengurangi kepercayaan pada capaian periode.', 'tanda');

INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-NAS-01', 'Kepatuhan Cuci Tangan', 'Nasional', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-NAS-02', 'Kepatuhan Penggunaan APD', 'Nasional', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-NAS-03', 'Kepatuhan Identifikasi Pasien', 'Nasional', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-KLI-01', 'Ketepatan Penginputan Tagihan Pasien', 'Klinik', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-KLI-02', 'Respon Time IGD < 5 Menit', 'Klinik', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-KPS-01', 'Kepatuhan Pengisian Safety Surgical Check', 'Keselamatan Pasien', '%', 'rasio');
INSERT IGNORE INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES ('IKM-KPS-02', 'Angka Kejadian Phlebitis', 'Keselamatan Pasien', 'per 1000 hari', 'rate_per_seribu');

INSERT IGNORE INTO mutu_indikator_versi (indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe, catatan)
SELECT i.id, '2025-01-01', d.n, d.den, NULL, 'min', d.cat
FROM mutu_indikator i JOIN (
  SELECT 'IKM-NAS-01' k, 'Jumlah momen cuci tangan sesuai standar' n, 'Jumlah peluang cuci tangan diobservasi' den, 'Definisi penyebut menunggu keputusan Tim Mutu (petugas vs peluang).' cat
  UNION ALL SELECT 'IKM-NAS-02', 'Jumlah petugas patuh APD sesuai indikasi', 'Jumlah petugas terindikasi memakai APD', 'Menunggu keputusan Tim Mutu.'
  UNION ALL SELECT 'IKM-NAS-03', 'Jumlah petugas melakukan identifikasi pasien dengan benar', 'Jumlah seluruh petugas bertugas', 'Penyebut berpotensi diambil dari jadwal petugas.'
  UNION ALL SELECT 'IKM-KLI-01', 'Jumlah penginputan tagihan pasien benar', 'Jumlah tagihan terverifikasi kasir', 'Verifikasi silang dengan tagihan_pasien dimungkinkan.'
  UNION ALL SELECT 'IKM-KLI-02', 'Jumlah pasien IGD ditangani kurang dari 5 menit', 'Jumlah seluruh pasien IGD', 'Penyebut dapat otomatis dari registrasi_igd. Jam kedatangan belum tersedia.'
  UNION ALL SELECT 'IKM-KPS-01', 'Jumlah petugas mengisi safety surgical check', 'Jumlah seluruh prosedur operasi', 'Menunggu keputusan Tim Mutu.'
  UNION ALL SELECT 'IKM-KPS-02', 'Jumlah kejadian phlebitis', 'Jumlah kumulatif hari pemasangan infus', 'Satuan per 1000 hari infus, bukan persen.'
) d ON d.k = i.kode;

INSERT IGNORE INTO mutu_unit_indikator (unit_kode, indikator_id, berlaku_dari, berlaku_sampai, urutan)
SELECT 'IGD', id, '2025-01-01', NULL, id FROM mutu_indikator;
