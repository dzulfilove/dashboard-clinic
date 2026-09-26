import React, { useState, useEffect } from 'react';
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
import AnalyticLoader from '../components/AnalyticLoader.js';

export default React.memo(function Dashboard() {
  const { user } = useAuthStore();
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [medForecast, setMedForecast] = useState<ForecastResult[]>([]);
  const [labEntries, setLabEntries] = useState<LabData[]>([]);
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisualizing, setIsVisualizing] = useState(true);

  // Month-Year defaults
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = d.getFullYear() === 2026 ? 2026 : 2026; // Match the seed year (2026)

  useEffect(() => {
    setIsVisualizing(true);
    const timer = setTimeout(() => {
      setIsVisualizing(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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

        const fetchSafely = async (endpoint: string) => {
          try {
            const res = await api.get(endpoint);
            return res.data;
          } catch (e: any) {
            if (e?.message !== 'Network Error') {
              console.warn(`Failed to fetch ${endpoint} silently:`, e?.message || e);
            }
            return null;
          }
        };

        // Fire parallel calls
        const [dbData, forecastData, labData, medData] = await Promise.all([
          fetchSafely('/db/status'),
          fetchSafely(`/obat/forecast?bulan=${currentMonth}&tahun=${currentYear}`),
          fetchSafely(`/lab/data?bulan=${currentMonth}&tahun=${currentYear}`),
          fetchSafely('/obat/master')
        ]);

        if (dbData) setDbStatus(dbData);
        setMedForecast(Array.isArray(forecastData) ? forecastData : []);
        setLabEntries(Array.isArray(labData) ? labData : []);
        setMedicines(Array.isArray(medData) ? medData : []);

        // Fetch users if admin
        if (user && user.role === 'admin') {
          try {
            const uRes = await api.get('/admin/users');
            setUserAccounts(uRes.data);
          } catch (uErr) {
            console.warn('Failed to load admin user list silently:', uErr);
          }
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
        className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-[#05161A] tracking-tight">
            Selamat Datang, {user?.nama}!
          </h1>
          <p className="text-[#072E33]/80 mt-1 text-xs font-normal">
            Anda login sebagai <span className="font-bold text-[#0C7075] capitalize">{user?.role}</span>. Kelola rekam data klinik Puri Medika terpadu di bawah ini.
          </p>
        </div>

        {/* Database Diagnostic health */}
        <div className="flex items-center space-x-3 glass-pill-action px-4 py-2.5 rounded-xl text-[#05161A]">
          <Database className={`h-5 w-5 ${dbStatus?.status === 'ONLINE' ? 'text-[#0C7075] animate-pulse' : 'text-amber-600 animate-pulse'}`} />
          <div>
            <div className="text-xs font-bold flex items-center gap-1.5">
              <span>Database Sync</span>
              <span className={`h-2 w-2 rounded-full ${dbStatus?.status === 'ONLINE' ? 'bg-[#0C7075]' : 'bg-amber-500'}`} />
            </div>
            <p className="text-xs text-[#072E33]/70 font-mono">
              {dbStatus?.status === 'ONLINE' ? 'VPS MySQL Terkoneksi' : 'Menggunakan Mode Virtual'}
            </p>
          </div>
        </div>
      </div>

      {(loading || isVisualizing) ? (
        <AnalyticLoader message="Menyiapkan data dashboard terpadu..." />
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1 - Lab Volume */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
              whileHover={{ y: -2 }}
              className="glass-card-primary p-5 flex flex-col justify-between"
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

              <button className="glass-pill-action w-full py-2.5 px-4 rounded-full text-white hover:bg-white/20 text-xs font-bold transition-colors">
                Lihat Rekapitulasi
              </button>
            </motion.div>

            {/* KPI 2 - Medications Catalog */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.10 }}
              whileHover={{ y: -2 }}
              className="glass-card-primary p-5 flex flex-col justify-between"
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

              <button className="glass-pill-action w-full py-2.5 px-4 rounded-full text-white hover:bg-white/20 text-xs font-bold transition-colors">
                Kelola Obat
              </button>
            </motion.div>

            {/* KPI 3 - Low Stock Pharmacy alerts */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
              whileHover={{ y: -2 }}
              className="glass-card-secondary p-5 flex flex-col justify-between text-white"
            >
              <div>
                <div className="flex items-center gap-3 text-white mb-5">
                  <AlertTriangle className={`h-5 w-5 ${criticalItems.length > 0 ? 'animate-pulse text-amber-200' : ''}`} />
                  <h3 className="font-semibold text-lg tracking-tight">Stok Kritis</h3>
                </div>
                
                <div className="text-white/90 text-sm mb-3">
                  <span className="font-bold text-xl mr-2">{loading ? '...' : criticalItems.length}</span> 
                  <span className="text-xs opacity-80">(Di bawah ROP)</span>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-2.5 mb-6">
                  <div className={`h-2.5 rounded-full ${criticalItems.length > 0 ? 'bg-amber-300' : 'bg-white'}`} style={{ width: criticalItems.length > 0 ? '100%' : '10%' }}></div>
                </div>
              </div>

              <button className="glass-pill-action w-full py-2.5 px-4 rounded-full text-white hover:bg-white/20 text-xs font-bold transition-colors">
                {criticalItems.length > 0 ? 'Lihat Peringatan' : 'Stok Aman'}
              </button>
            </motion.div>

            {/* KPI 4 - Staff / Accounts */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.20 }}
              whileHover={{ y: -2 }}
              className="glass-card-primary p-5 flex flex-col justify-between"
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

              <button className="glass-pill-action w-full py-2.5 px-4 rounded-full text-white hover:bg-white/20 text-xs font-bold transition-colors">
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
              className="glass-card p-6 lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-[#0C7075]" />
                  <h2 className="text-sm font-bold text-[#05161A] font-display">Peringatan Rekomendasi Reorder Farmasi</h2>
                </div>
                {criticalItems.length > 0 && (
                  <span className="bg-[#0C7075]/15 text-[#05161A] text-xs font-bold px-2 py-0.5 rounded border border-[#0C7075]/30 font-mono animate-pulse">
                    Butuh Order Darurat
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-[#072E33]/60 text-xs">Menghitung inventory farmasi...</div>
              ) : criticalItems.length === 0 ? (
                <div className="glass-inset-state p-6 text-center text-[#05161A]">
                  <CheckCircle className="h-8 w-8 text-[#0C7075] mx-auto mb-2" />
                  <p className="font-bold text-xs">Semua stok obat aman!</p>
                  <p className="text-xs text-[#072E33]/80 mt-1 font-normal animate-pulse">Tidak ada obat dengan tingkat stok yang berada di bawah tingkat kecukupan minimum.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {criticalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 glass-inset-state text-xs">
                      <div>
                        <span className="text-xs font-mono font-bold text-[#05161A] bg-[#6DA5C0]/35 px-2 py-0.5 rounded border border-[#0C7075]/20">
                          {item.kode_obat}
                        </span>
                        <h4 className="font-bold text-[#05161A] mt-1.5 text-xs">{item.nama_obat}</h4>
                        <div className="flex items-center space-x-3 text-xs text-[#072E33]/70 mt-1 font-normal">
                          <span>Proyeksi Kebutuhan (3 bln): <span className="font-bold text-[#05161A]">{item.proyeksi_kebutuhan}</span></span>
                          <span>•</span>
                          <span>Lead Time: <span className="font-bold text-[#05161A]">{item.lead_time_hari} Hari</span></span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-[#072E33]/70 font-normal">Stok Saat Ini / Reorder Point</p>
                        <p className="text-sm font-bold text-[#0C7075] mt-0.5 font-mono">
                          {item.current_stock} <span className="text-xs font-normal text-[#072E33]/70">/ {item.reorder_qty}</span>
                        </p>
                        <span className="text-xs inline-block bg-white/80 text-[#05161A] px-1.5 py-0.5 rounded border border-[#0C7075]/30 mt-1 font-bold">
                          Defisit: {item.reorder_qty - item.current_stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 border-t border-[#0C7075]/20 pt-4 flex justify-end">
                <Link 
                  to="/farmasi/forecast" 
                  className="text-xs font-bold text-[#0C7075] hover:text-[#05161A] flex items-center space-x-1"
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
              className="glass-card p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-sm font-bold text-[#05161A] mb-4 flex items-center gap-2 font-display">
                  <Activity className="h-4.5 w-4.5 text-[#0C7075]" />
                  <span>Akses Cepat Modul</span>
                </h2>
                
                <div className="space-y-3">
                  {/* Shortcut 1: Input Lab */}
                  {(user?.role === 'admin' || user?.role === 'lab') && (
                    <Link 
                      to="/lab/input" 
                      className="flex items-center justify-between p-3.5 glass-pill-action rounded-xl text-left group"
                    >
                      <div>
                        <h4 className="font-bold text-[#05161A] text-xs">Input Laboratorium</h4>
                        <p className="text-xs text-[#0C7075] mt-1 font-medium">Submit jumlah pemeriksaan bulanan klinis</p>
                      </div>
                      <ArrowRight className="h-4.5 w-4.5 text-[#0C7075] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}

                  {/* Shortcut 2: Input Farmasi */}
                  {(user?.role === 'admin' || user?.role === 'farmasi') && (
                    <Link 
                      to="/farmasi/input" 
                      className="flex items-center justify-between p-3.5 glass-pill-action rounded-xl text-left group"
                    >
                      <div>
                        <h4 className="font-bold text-[#05161A] text-xs">Konsumsi Obat</h4>
                        <p className="text-xs text-[#0C7075] mt-1 font-medium">Input log penerimaan & pemakaian obat</p>
                      </div>
                      <ArrowRight className="h-4.5 w-4.5 text-[#0C7075] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}

                  {/* Shortcut 3: ABC Analysis */}
                  {(user?.role === 'admin' || user?.role === 'farmasi') && (
                    <Link 
                      to="/farmasi/abc" 
                      className="flex items-center justify-between p-3.5 glass-pill-action rounded-xl text-left group"
                    >
                      <div>
                        <h4 className="font-bold text-[#05161A] text-xs">Analisis ABC (Spend)</h4>
                        <p className="text-xs text-[#072E33]/80 mt-1 font-medium">Klasifikasi nilai kontribusi biaya obat</p>
                      </div>
                      <ArrowRight className="h-4.5 w-4.5 text-[#05161A] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}

                  {/* Shortcut 4: User Accounts */}
                  {user?.role === 'admin' && (
                    <Link 
                      to="/admin/users" 
                      className="flex items-center justify-between p-3.5 glass-pill-action rounded-xl text-left group"
                    >
                      <div>
                        <h4 className="font-bold text-[#05161A] text-xs">Kelola Petugas</h4>
                        <p className="text-xs text-[#072E33]/80 mt-1 font-medium">Tambah akun & ubah hak akses role</p>
                      </div>
                      <ArrowRight className="h-4.5 w-4.5 text-[#05161A] group-hover:translate-x-1 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#0C7075]/20 text-center">
                <span className="text-xs text-[#072E33]/70 font-mono tracking-wider font-bold">PURI MEDIKA INTEGRATED CONTROL PANEL</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
});
