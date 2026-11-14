import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import PageHeader from '../components/PageHeader.js';
import { 
  FlaskConical, 
  Pill, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle,
  FileCheck,
  Package,
  Layers,
  Activity,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import api from '../services/api.js';
import { DbStatus, ForecastResult, LabData, ObatMaster, User as UserType } from '../types.js';
import AnalyticLoader from '../components/AnalyticLoader.js';
import { MONTHS_ID } from '../utils/dateFormat.js';

export default React.memo(function Dashboard() {
  const { user } = useAuthStore();
  const [, setDbStatus] = useState<DbStatus | null>(null);
  const [medForecast, setMedForecast] = useState<ForecastResult[]>([]);
  const [labEntries, setLabEntries] = useState<LabData[]>([]);
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisualizing, setIsVisualizing] = useState(true);

  // Month-Year defaults
  const d = new Date();
  const currentMonth = d.getMonth() + 1;
  const currentYear = 2026;

  useEffect(() => {
    setIsVisualizing(true);
    const timer = setTimeout(() => {
      setIsVisualizing(false);
    }, 400);
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
          console.log('Dashboard stats fetch unauthenticated.');
        } else {
          console.error('Failed to load dashboard statistics', err);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, [user, currentMonth, currentYear]);

  // Calculations
  const criticalItems = medForecast.filter(item => item.status_stok === 'Kritis (Perlu Order)');
  const totalLabExaminations = labEntries.reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="space-y-6 font-sans pb-10">
      <PageHeader
        title={`Selamat Datang, ${user?.nama || 'Petugas'}!`}
        subtitle="Ringkasan aktivitas operasional terpadu Klinik Puri Medika. Pantau data kunjungan, rekapitulasi laboratorium, dan kontrol persediaan obat farmasi dalam satu layar."
      />

      {/* 1. Slate & Ice Quick Action Strip */}
      <motion.div
        id="welcome-banner"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        className="rounded-2xl p-5 sm:p-6 bg-[#213145] text-white relative overflow-hidden shadow-[0_8px_24px_rgba(33,49,69,0.18)]"
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#CCDCEF]/16 text-[#CCDCEF] font-semibold">
              <Calendar className="h-3.5 w-3.5 text-[#FF8574]" />
              <span>Periode Berjalan: {MONTHS_ID[currentMonth - 1]} {currentYear}</span>
            </div>
            <span className="text-[#B8C8DB]">
              Akses cepat ke modul analisis dan layanan operasional utama
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/demografi/pasien"
              className="si-btn si-btn--accent text-xs font-bold shadow-md hover:scale-[1.02] transition-transform"
              style={{ background: '#FF8574', color: '#222526' }}
            >
              <Sparkles className="h-4 w-4" />
              <span>Demografi Pasien</span>
            </Link>

            <Link
              to="/farmasi/forecast"
              className="si-btn si-btn--secondary text-xs font-semibold"
              style={{ background: '#CCDCEF', color: '#213145' }}
            >
              <Pill className="h-4 w-4" />
              <span>Peramalan Stok Obat</span>
            </Link>

            <Link
              to="/pelayanan/rawat-jalan"
              className="si-btn si-btn--ghost text-xs font-medium text-white hover:bg-white/10"
            >
              <span>Pelayanan Rawat Jalan</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </div>
      </motion.div>

      {(loading || isVisualizing) ? (
        <AnalyticLoader message="Memuat metrik Slate & Ice dashboard..." />
      ) : (
        <>
          {/* 2. Main KPI Stat Cards Grid (.si-card) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1 - Lab Volume */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.05 }}
              className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] hover:shadow-[0_12px_32px_rgba(33,49,69,0.12)] transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                    Laboratorium
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center">
                    <FlaskConical className="h-4.5 w-4.5 text-[#213145]" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h3 className="si-metric text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                    {totalLabExaminations.toLocaleString('id-ID')}
                  </h3>
                  <p className="si-unit text-xs text-[#516070] font-medium">
                    Pemeriksaan sampel bulan ini
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5EEFF] flex items-center justify-between">
                <span className="text-[11px] text-[#74777C]">Aktif periode berjalan</span>
                <Link 
                  to="/lab/dashboard" 
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#213145] hover:text-[#516070] transition-colors"
                >
                  <span>Rekap</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* KPI 2 - Medications Catalog */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.10 }}
              className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] hover:shadow-[0_12px_32px_rgba(33,49,69,0.12)] transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                    Katalog Obat
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center">
                    <Pill className="h-4.5 w-4.5 text-[#213145]" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h3 className="si-metric text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                    {medicines.length.toLocaleString('id-ID')}
                  </h3>
                  <p className="si-unit text-xs text-[#516070] font-medium">
                    Item obat aktif di master
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5EEFF] flex items-center justify-between">
                <span className="text-[11px] text-[#74777C]">Gudang &amp; Apotek</span>
                <Link 
                  to="/farmasi/master" 
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#213145] hover:text-[#516070] transition-colors"
                >
                  <span>Master Obat</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* KPI 3 - Critical Low Stock Alerts (Single Coral Accent) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.15 }}
              className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] hover:shadow-[0_12px_32px_rgba(33,49,69,0.12)] transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                    Stok Kritis
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${criticalItems.length > 0 ? 'bg-[#FFE9E5] text-[#A13E32]' : 'bg-[#E5EEFF] text-[#213145]'}`}>
                    <AlertTriangle className={`h-4.5 w-4.5 ${criticalItems.length > 0 ? 'text-[#FF8574]' : 'text-[#213145]'}`} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h3 className={`si-metric text-2xl sm:text-3xl font-extrabold font-display tabular-nums ${criticalItems.length > 0 ? 'text-[#A13E32]' : 'text-[#0B1C30]'}`}>
                    {criticalItems.length}
                  </h3>
                  <p className="si-unit text-xs text-[#516070] font-medium">
                    {criticalItems.length > 0 ? 'Item di bawah ROP minimum' : 'Semua item dalam batas aman'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5EEFF] flex items-center justify-between">
                <span className={`text-[11px] font-semibold ${criticalItems.length > 0 ? 'text-[#A13E32]' : 'text-[#047857]'}`}>
                  {criticalItems.length > 0 ? 'Perlu Restok' : 'Optimal'}
                </span>
                <Link 
                  to="/farmasi/forecast" 
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#213145] hover:text-[#516070] transition-colors"
                >
                  <span>Lihat ROP</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* KPI 4 - Staff / Accounts */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.20 }}
              className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] hover:shadow-[0_12px_32px_rgba(33,49,69,0.12)] transition-all flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                    Petugas Klinik
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center">
                    <User className="h-4.5 w-4.5 text-[#213145]" />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h3 className="si-metric text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                    {user?.role === 'admin' ? userAccounts.length : 'Aktif'}
                  </h3>
                  <p className="si-unit text-xs text-[#516070] font-medium">
                    Akses petugas terverifikasi
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5EEFF] flex items-center justify-between">
                <span className="text-[11px] text-[#74777C]">Role: {user?.role || 'User'}</span>
                {user?.role === 'admin' ? (
                  <Link 
                    to="/admin/users" 
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#213145] hover:text-[#516070] transition-colors"
                  >
                    <span>Kelola</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-[#047857]">Online</span>
                )}
              </div>
            </motion.div>
          </div>

          {/* 3. Reorder Alerts & Operational Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Reorder Stock Warning (2 cols) */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.25 }}
              className="si-card bg-white rounded-2xl p-6 lg:col-span-2 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                      INVENTARIS FARMASI
                    </span>
                    <h2 className="text-base font-bold text-[#0B1C30] font-display mt-0.5">
                      Peringatan Rekomendasi Reorder Obat
                    </h2>
                  </div>

                  {criticalItems.length > 0 ? (
                    <span className="si-tag si-tag--coral bg-[#FFE9E5] text-[#A13E32] px-2.5 py-1 rounded-md text-xs font-bold">
                      {criticalItems.length} Item Kritis
                    </span>
                  ) : (
                    <span className="si-tag si-tag--success bg-[#ECFDF5] text-[#047857] px-2.5 py-1 rounded-md text-xs font-bold">
                      Stok Optimal
                    </span>
                  )}
                </div>

                {criticalItems.length === 0 ? (
                  <div className="p-8 text-center bg-[#EFF4FF] rounded-xl my-2">
                    <CheckCircle className="h-10 w-10 text-[#10B981] mx-auto mb-2" />
                    <p className="font-bold text-sm text-[#0B1C30] font-display">Semua Stok Obat Terjaga Aman</p>
                    <p className="text-xs text-[#516070] mt-1 max-w-sm mx-auto">
                      Seluruh persediaan obat di gudang dan apotek saat ini berada di atas tingkat Reorder Point (ROP) minimum.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {criticalItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#EFF4FF] hover:bg-[#E5EEFF] transition-colors rounded-xl text-xs gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[11px] text-[#213145] bg-[#CCDCEF] px-2 py-0.5 rounded">
                              {item.kode_obat}
                            </span>
                            <span className="text-[11px] text-[#516070]">Lead Time: {item.lead_time_hari} Hari</span>
                          </div>
                          <h4 className="font-bold text-sm text-[#0B1C30] mt-1 font-display">{item.nama_obat}</h4>
                          <p className="text-xs text-[#516070] mt-0.5">
                            Proyeksi Kebutuhan (3 bln): <span className="font-semibold text-[#0B1C30]">{item.proyeksi_kebutuhan}</span>
                          </p>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/50">
                          <p className="text-[11px] text-[#516070]">Stok / Batas ROP</p>
                          <p className="text-sm font-bold text-[#A13E32] font-mono mt-0.5">
                            {item.current_stock} <span className="text-xs text-[#74777C]">/ {item.reorder_qty}</span>
                          </p>
                          <span className="inline-block bg-[#FFE9E5] text-[#A13E32] font-semibold text-[11px] px-2 py-0.5 rounded mt-1">
                            Defisit: {item.reorder_qty - item.current_stock}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5EEFF] flex items-center justify-between">
                <span className="text-xs text-[#74777C]">
                  Kalkulasi otomatis metode Reorder Point (ROP)
                </span>
                <Link 
                  to="/farmasi/forecast" 
                  className="si-btn si-btn--soft text-xs font-semibold"
                  style={{ background: '#E5EEFF', color: '#213145' }}
                >
                  <span>Analisis Lengkap</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
            </motion.div>

            {/* Right: Operational Shortcuts (1 col) */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1], delay: 0.30 }}
              className="si-card bg-white rounded-2xl p-6 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex flex-col justify-between"
            >
              <div>
                <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                  PINTASAN CEPAT
                </span>
                <h2 className="text-base font-bold text-[#0B1C30] font-display mt-0.5 mb-4">
                  Aksi Operasional Klinik
                </h2>

                <div className="space-y-2.5">
                  <Link 
                    to="/demografi/pasien" 
                    className="flex items-center justify-between p-3 rounded-xl bg-[#EFF4FF] hover:bg-[#E5EEFF] transition-all group border border-transparent hover:border-[#CCDCEF]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#213145] shadow-2xs">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#0B1C30]">Demografi Kunjungan</h4>
                        <p className="text-[11px] text-[#516070]">Top pasien loyal &amp; import tagihan</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#516070] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link 
                    to="/pelayanan/rawat-jalan" 
                    className="flex items-center justify-between p-3 rounded-xl bg-[#EFF4FF] hover:bg-[#E5EEFF] transition-all group border border-transparent hover:border-[#CCDCEF]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#213145] shadow-2xs">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#0B1C30]">Pelayanan Rawat Jalan</h4>
                        <p className="text-[11px] text-[#516070]">Antrean &amp; penanganan dokter</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#516070] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link 
                    to="/farmasi/input" 
                    className="flex items-center justify-between p-3 rounded-xl bg-[#EFF4FF] hover:bg-[#E5EEFF] transition-all group border border-transparent hover:border-[#CCDCEF]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#213145] shadow-2xs">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#0B1C30]">Konsumsi Obat Harian</h4>
                        <p className="text-[11px] text-[#516070]">Input mutasi dan pemakaian</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#516070] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link 
                    to="/lab/input" 
                    className="flex items-center justify-between p-3 rounded-xl bg-[#EFF4FF] hover:bg-[#E5EEFF] transition-all group border border-transparent hover:border-[#CCDCEF]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#213145] shadow-2xs">
                        <FlaskConical className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#0B1C30]">Input Pemeriksaan Lab</h4>
                        <p className="text-[11px] text-[#516070]">Catat volume tes laboratorium</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#516070] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5EEFF]">
                <Link 
                  to="/design-system" 
                  className="w-full si-btn si-btn--secondary text-xs font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#CCDCEF', color: '#213145' }}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Lihat Panduan Design System</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
});
