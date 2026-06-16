export interface User {
  id: number;
  nama: string;
  email: string;
  role: 'admin' | 'lab' | 'farmasi';
  created_at?: string;
}

export interface DbStatus {
  isVirtual: boolean;
  host: string;
  database: string;
  user: string;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'VIRTUAL';
  error: string | null;
}

export interface LabParameter {
  id: number;
  kategori: string;
  nama_parameter: string;
  is_active: number;
}

export interface LabData {
  id?: number;
  parameter_id: number;
  bulan: number;
  tahun: number;
  jumlah: number;
  input_by?: number;
  nama_parameter?: string;
  kategori?: string;
  created_at?: string;
}

export interface ObatMaster {
  id: number;
  kode_obat: string;
  nama_obat: string;
  golongan: string;
  satuan: string;
  kemasan: string;
  harga_satuan: number;
  lead_time_hari: number;
  is_active: number;
}

export interface ObatKonsumsi {
  id?: number;
  obat_id: number;
  bulan: number;
  tahun: number;
  stok_awal: number;
  penerimaan: number;
  pemakaian: number;
  sisa_stok: number;
  input_by?: number;
  nama_obat?: string;
  kode_obat?: string;
  harga_satuan?: number;
  golongan?: string;
}

export interface ForecastResult {
  id: number;
  kode_obat: string;
  nama_obat: string;
  proyeksi_kebutuhan: number;
  safety_stock: number;
  reorder_qty: number;
  current_stock: number;
  status_stok: 'Kritis (Perlu Order)' | 'Aman';
  lead_time_hari: number;
}

export interface AbcItem {
  obat_id: number;
  kode_obat: string;
  nama_obat: string;
  golongan: string;
  pemakaian: number;
  harga_satuan: number;
  total_nilai: number;
  kumulatif_persen: number;
  kontribusi_persen: number;
  klasifikasi: 'A' | 'B' | 'C';
}

export interface AbcResult {
  items: AbcItem[];
  total_investasi: number;
}
