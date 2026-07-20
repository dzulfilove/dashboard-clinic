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
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div 
        id="welcome-banner" 
        className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
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
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 - Lab Volume */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
          whileHover={{ y: -2, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
          style={{ willChange: 'transform, opacity' }}
          className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 text-white mb-5">
              <FlaskConical className="h-5 w-5" />
              <h3 className="font-semibold text-lg tracking-tight">Laboratorium</h3>
            </div>
            
            <div className="text-white/90 text-sm mb-3">
              <span className="font-bold text-xl mr-2">{loading ? '...' : totalLabExaminations}</span> 
              <span className="text-xs opacity-80">(Bulan ini)</span>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
              <div className="bg-white h-2.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
          </div>

          <button className="w-full py-2.5 px-4 rounded-full border border-white/30 text-white hover:bg-white/10 text-xs font-medium transition-colors">
            Lihat Rekapitulasi
          </button>
        </motion.div>

        {/* KPI 2 - Medications Catalog */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.10 }}
          whileHover={{ y: -2, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
          style={{ willChange: 'transform, opacity' }}
          className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 text-white mb-5">
              <Pill className="h-5 w-5" />
              <h3 className="font-semibold text-lg tracking-tight">Katalog Obat</h3>
            </div>
            
            <div className="text-white/90 text-sm mb-3">
              <span className="font-bold text-xl mr-2">{loading ? '...' : medicines.length}</span> 
              <span className="text-xs opacity-80">(Item aktif)</span>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
              <div className="bg-white h-2.5 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>

          <button className="w-full py-2.5 px-4 rounded-full border border-white/30 text-white hover:bg-white/10 text-xs font-medium transition-colors">
            Kelola Obat
          </button>
        </motion.div>

        {/* KPI 3 - Low Stock Pharmacy alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
          whileHover={{ y: -2, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
          style={{ willChange: 'transform, opacity' }}
          className={`bg-gradient-to-br backdrop-blur-xl rounded-2xl p-5 border shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between ${criticalItems.length > 0 ? 'from-rose-800/80 to-rose-700/80 border-rose-400/40 ring-2 ring-rose-500/20' : 'from-emerald-800/80 to-teal-700/80 border-white/20'}`}
        >
          <div>
            <div className="flex items-center gap-3 text-white mb-5">
              <AlertTriangle className={`h-5 w-5 ${criticalItems.length > 0 ? 'animate-pulse' : ''}`} />
              <h3 className="font-semibold text-lg tracking-tight">Stok Kritis</h3>
            </div>
            
            <div className="text-white/90 text-sm mb-3">
              <span className="font-bold text-xl mr-2">{loading ? '...' : criticalItems.length}</span> 
              <span className="text-xs opacity-80">(Di bawah ROP)</span>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
              <div className={`h-2.5 rounded-full ${criticalItems.length > 0 ? 'bg-white' : 'bg-white/50'}`} style={{ width: criticalItems.length > 0 ? '100%' : '10%' }}></div>
            </div>
          </div>

          <button className={`w-full py-2.5 px-4 rounded-full border text-xs font-medium transition-colors ${criticalItems.length > 0 ? 'border-white text-white hover:bg-white hover:text-rose-700' : 'border-white/30 text-white hover:bg-white/10'}`}>
            {criticalItems.length > 0 ? 'Lihat Peringatan' : 'Stok Aman'}
          </button>
        </motion.div>

        {/* KPI 4 - Staff / Accounts */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.20 }}
          whileHover={{ y: -2, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
          style={{ willChange: 'transform, opacity' }}
          className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-3 text-white mb-5">
              <User className="h-5 w-5" />
              <h3 className="font-semibold text-lg tracking-tight">Akses Petugas</h3>
            </div>
            
            <div className="text-white/90 text-sm mb-3">
              <span className="font-bold text-xl mr-2">{loading ? '...' : (user?.role === 'admin' ? userAccounts.length : 'Aktif')}</span> 
              <span className="text-xs opacity-80">(Akun terdaftar)</span>
            </div>
            
            <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
              <div className="bg-white h-2.5 rounded-full" style={{ width: '40%' }}></div>
            </div>
          </div>

          <button className="w-full py-2.5 px-4 rounded-full border border-white/30 text-white hover:bg-white/10 text-xs font-medium transition-colors">
            Kelola Akses
          </button>
        </motion.div>
      </div>

      {/* Critical Stock Notification and Actions block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Critical Stock Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
          style={{ willChange: 'transform, opacity' }}
          className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-6 lg:col-span-2"
        >
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
        </motion.div>

        {/* Right: Quick Action Menu Shortcuts */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
          style={{ willChange: 'transform, opacity' }}
          className="bg-white/70 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between"
        >
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
                  className="flex items-center justify-between p-3.5 bg-teal-50/40 backdrop-blur-sm border border-slate-100 rounded-xl hover:bg-teal-50/80 hover:border-teal-200 transition-all text-left group shadow-xs"
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
                  className="flex items-center justify-between p-3.5 bg-teal-50/40 backdrop-blur-sm border border-slate-100 rounded-xl hover:bg-teal-50/80 hover:border-teal-200 transition-all text-left group shadow-xs"
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
                  className="flex items-center justify-between p-3.5 bg-slate-50/50 backdrop-blur-sm border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-all text-left group shadow-xs"
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
                  className="flex items-center justify-between p-3.5 bg-slate-100/45 backdrop-blur-sm border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-all text-left group shadow-xs"
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
        </motion.div>
      </div>
    </div>
  );

}
