import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { 
  TrendingUp, 
  FlaskConical, 
  Pill, 
  User, 
  AlertTriangle, 
  Database, 
  ArrowRight, 
  Activity,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import api from '../services/api.js';
import { DbStatus, ForecastResult, LabData, ObatMaster, User as UserType } from '../types.js';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [medForecast, setMedForecast] = useState<ForecastResult[]>([]);
  const [labEntries, setLabEntries] = useState<LabData[]>([]);
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  // Month-Year defaults
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear() === 2026 ? 2026 : 2026; // Match the seed year (2026)

  useEffect(() => {
    api.post('/logs', {
      action_type: 'VIEW',
      module_name: 'Dashboard',
      description: 'Membuka Dashboard Terpadu'
    }).catch(err => console.warn('Gagal mencatat log pembukaan halaman:', err));
  }, []);

  useEffect(() => {
    async function fetchDashboardStats() {
      const token = localStorage.getItem('clinic_token');
      if (!token || !user) {
        return;
      }

      try {
        setLoading(true);
        // Fire parallel calls
        const [dbRes, forecastRes, labRes, medRes] = await Promise.all([
          api.get('/db/status'),
          api.get(`/obat/forecast?bulan=${currentMonth}&tahun=${currentYear}`),
          api.get(`/lab/data?bulan=${currentMonth}&tahun=${currentYear}`),
          api.get('/obat/master')
        ]);

        setDbStatus(dbRes.data);
        setMedForecast(Array.isArray(forecastRes.data) ? forecastRes.data : []);
        setLabEntries(Array.isArray(labRes.data) ? labRes.data : []);
        setMedicines(Array.isArray(medRes.data) ? medRes.data : []);

        // Fetch users if admin
        if (user && user.role === 'admin') {
          const uRes = await api.get('/admin/users');
          setUserAccounts(uRes.data);
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          console.log('Dashboard stats fetch unauthenticated (session expired or missing token). Handled by interceptor.');
        } else {
          console.error('Failed to load dashboard statistics', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, [user]);

  // Calculations
  const criticalItems = medForecast.filter(item => item.status_stok === 'Kritis (Perlu Order)');
  const totalLabExaminations = labEntries.reduce((sum, item) => sum + item.jumlah, 0);

  // Framer Motion animation sets
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 font-sans"
    >
      {/* Welcome Banner */}
      <motion.div 
        variants={itemVariants}
        id="welcome-banner" 
        className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Selamat Datang, {user?.nama}!
          </h1>
          <p className="text-slate-500 mt-1 text-xs font-normal">
            Anda login sebagai <span className="font-medium text-teal-600 capitalize">{user?.role}</span>. Kelola rekam data klinik Puri Medika terpadu di bawah ini.
          </p>
        </div>

        {/* Database Diagnostic health */}
        <div className="flex items-center space-x-3 bg-white/55 px-4 py-2.5 rounded-xl text-slate-800 shadow-sm">
          <Database className={`h-5 w-5 ${dbStatus?.status === 'ONLINE' ? 'text-emerald-500 animate-pulse' : 'text-amber-500 animate-pulse'}`} />
          <div>
            <div className="text-xxs font-medium flex items-center gap-1.5">
              <span>Database Sync</span>
              <span className={`h-2 w-2 rounded-full ${dbStatus?.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-xxs text-slate-400 font-mono">
              {dbStatus?.status === 'ONLINE' ? 'VPS MySQL Terkoneksi' : 'Menggunakan Mode Virtual'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main KPI Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 - Lab Volume */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
          transition={{ duration: 0.2 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
              <FlaskConical className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
              Bulan Ini
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">{loading ? '...' : totalLabExaminations}</h3>
            <p className="text-xxs font-normal text-slate-500 mt-1">Total Pemeriksaan Laboratorium</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
        </motion.div>

        {/* KPI 2 - Medications Catalog */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
          transition={{ duration: 0.2 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
              <Pill className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
              Katalog
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">{loading ? '...' : medicines.length}</h3>
            <p className="text-xxs font-normal text-slate-500 mt-1">Item Obat Aktif</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
        </motion.div>

        {/* KPI 3 - Low Stock Pharmacy alerts */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
          transition={{ duration: 0.2 }}
          className={`bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all ${criticalItems.length > 0 ? 'ring-2 ring-rose-500' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className={`p-3 rounded-xl group-hover:scale-105 transition-transform ${criticalItems.length > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <span className={`text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full ${criticalItems.length > 0 ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'}`}>
              {criticalItems.length > 0 ? 'Kritis' : 'Normal'}
            </span>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-semibold tracking-tight font-display ${criticalItems.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {loading ? '...' : criticalItems.length}
            </h3>
            <p className="text-xxs font-normal text-slate-500 mt-1">Obat Dibawah Reorder Point</p>
          </div>
          <div className={`absolute bottom-0 inset-x-0 h-1 ${criticalItems.length > 0 ? 'bg-rose-600' : 'bg-emerald-600'}`}></div>
        </motion.div>

        {/* KPI 4 - Staff / Accounts */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
          transition={{ duration: 0.2 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 shadow-sm relative overflow-hidden group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-slate-50 text-slate-700 rounded-xl group-hover:scale-105 transition-transform">
              <User className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-mono font-medium bg-slate-100/80 text-slate-800 px-2.5 py-0.5 rounded-full">
              Petugas
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
              {loading ? '...' : (user?.role === 'admin' ? userAccounts.length : 'Aktif')}
            </h3>
            <p className="text-xxs font-normal text-slate-500 mt-1">Akun Akses Terdaftar</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-600"></div>
        </motion.div>
      </motion.div>

      {/* Critical Stock Notification and Actions block */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Critical Stock Alerts */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
              <h2 className="text-sm font-semibold text-slate-900 font-display">Peringatan Rekomendasi Reorder Farmasi</h2>
            </div>
            {criticalItems.length > 0 && (
              <span className="bg-rose-50 text-rose-800 text-[10px] font-medium px-2 py-0.5 rounded border border-rose-100/55 font-mono animate-pulse">
                Butuh Order Darurat
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Menghitung inventory farmasi...</div>
          ) : criticalItems.length === 0 ? (
            <div className="bg-emerald-50/40 backdrop-blur-sm border border-emerald-100/60 rounded-xl p-6 text-center text-emerald-800">
              <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-xs">Semua stok obat aman!</p>
              <p className="text-xxs text-emerald-650 mt-1 font-normal animate-pulse">Tidak ada obat dengan tingkat stok yang berada di bawah tingkat kecukupan minimum.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {criticalItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-rose-50/30 backdrop-blur-sm border border-rose-100/50 rounded-xl hover:bg-rose-50/70 transition-colors text-xxs">
                  <div>
                    <span className="text-[10px] font-mono font-medium text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                      {item.kode_obat}
                    </span>
                    <h4 className="font-medium text-slate-800 mt-1.5 text-xs">{item.nama_obat}</h4>
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-1 font-normal">
                      <span>Proyeksi Kebutuhan (3 bln): <span className="font-medium text-slate-705">{item.proyeksi_kebutuhan}</span></span>
                      <span>•</span>
                      <span>Lead Time: <span className="font-medium text-slate-705">{item.lead_time_hari} Hari</span></span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-normal">Stok Saat Ini / Reorder Point</p>
                    <p className="text-sm font-semibold text-rose-600 mt-0.5 font-mono">
                      {item.current_stock} <span className="text-xxs font-normal text-slate-400">/ {item.reorder_qty}</span>
                    </p>
                    <span className="text-[10px] inline-block bg-white text-rose-750 px-1.5 py-0.5 rounded border border-rose-100 mt-1 font-medium">
                      Defisit: {item.reorder_qty - item.current_stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4 flex justify-end">
            <Link 
              to="/farmasi/forecast" 
              className="text-xxs font-medium text-teal-600 hover:text-teal-800 flex items-center space-x-1"
            >
              <span>Lihat Detail Peramalan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Quick Action Menu Shortcuts */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2 font-display">
              <Activity className="h-4.5 w-4.5 text-teal-600" />
              <span>Akses Cepat Modul</span>
            </h2>
            
            <div className="space-y-3">
              {/* Shortcut 1: Input Lab */}
              {(user?.role === 'admin' || user?.role === 'lab') && (
                <Link 
                  to="/lab/input" 
                  className="flex items-center justify-between p-3.5 bg-teal-50/40 backdrop-blur-sm border border-teal-150/40 rounded-xl hover:bg-teal-50/80 hover:border-teal-300/60 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-semibold text-teal-900 text-xs">Input Laboratorium</h4>
                    <p className="text-xxs text-teal-600 mt-1 font-normal">Submit jumlah pemeriksaan bulanan klinis</p>
                  </div>
                  <ArrowRight className="h-4.5 w-4.5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              {/* Shortcut 2: Input Farmasi */}
              {(user?.role === 'admin' || user?.role === 'farmasi') && (
                <Link 
                  to="/farmasi/input" 
                  className="flex items-center justify-between p-3.5 bg-teal-50/40 backdrop-blur-sm border border-teal-150/40 rounded-xl hover:bg-teal-50/80 hover:border-teal-300/60 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-semibold text-teal-900 text-xs">Konsumsi Obat</h4>
                    <p className="text-xxs text-teal-600 mt-1 font-normal">Input log penerimaan & pemakaian obat</p>
                  </div>
                  <ArrowRight className="h-4.5 w-4.5 text-teal-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              {/* Shortcut 3: ABC Analysis */}
              {(user?.role === 'admin' || user?.role === 'farmasi') && (
                <Link 
                  to="/farmasi/abc" 
                  className="flex items-center justify-between p-3.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-350 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs">Analisis ABC (Spend)</h4>
                    <p className="text-xxs text-slate-500 mt-1 font-normal">Klasifikasi nilai kontribusi biaya obat</p>
                  </div>
                  <ArrowRight className="h-4.5 w-4.5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              {/* Shortcut 4: User Accounts */}
              {user?.role === 'admin' && (
                <Link 
                  to="/admin/users" 
                  className="flex items-center justify-between p-3.5 bg-slate-100/45 backdrop-blur-sm border border-slate-200/50 rounded-xl hover:bg-slate-100 hover:border-slate-300/80 transition-all text-left group"
                >
                  <div>
                    <h4 className="font-semibold text-slate-800 text-xs">Kelola Petugas</h4>
                    <p className="text-xxs text-slate-500 mt-1 font-normal">Tambah akun & ubah hak akses role</p>
                  </div>
                  <ArrowRight className="h-4.5 w-4.5 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100/50 text-center">
            <span className="text-xxs text-slate-400 font-mono tracking-wider">PURI MEDIKA INTEGRATED CONTROL PANEL</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
