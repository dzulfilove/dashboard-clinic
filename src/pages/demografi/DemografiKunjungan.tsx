import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MapPin, 
  PieChart as ChartIcon, 
  Search, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Activity, 
  Sparkles, 
  X, 
  User, 
  Filter,
  BarChart2,
  Star,
  MessageSquare,
  History,
  Phone,
  Edit2,
  Send,
  Trash2,
  Check,
  UserPlus,
  UserX,
  AlertTriangle,
  Mail,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api.js';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import AnalyticLoader from '../../components/AnalyticLoader.js';

interface DemografiProps {
  activeTab: 'loyal' | 'wilayah' | 'pasien';
}

interface Patient {
  no_rm: string;
  nama: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string;
  alamat: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  total_visits: number;
  is_loyal?: boolean;
  no_telp?: string;
}

interface RegionStat {
  kota?: string;
  kecamatan?: string;
  kelurahan?: string;
  jumlah_pasien: number;
  jumlah_kunjungan: number;
}

interface GenderStat {
  jenis_kelamin: string;
  jumlah: number;
}

interface AgeStat {
  kelompok_usia: string;
  jumlah: number;
}

interface VisitHistory {
  no_registrasi: string;
  tanggal_pelayanan: string;
  tipe: string;
  dpjp: string;
  icd: string;
}

export default function DemografiKunjungan() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'loyal' | 'wilayah' | 'pasien'>('pasien');
  const [loading, setLoading] = useState(true);
  const [isVisualizing, setIsVisualizing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for API data
  const [topAllTime, setTopAllTime] = useState<Patient[]>([]);
  const [topPeriod, setTopPeriod] = useState<Patient[]>([]);
  const [byKota, setByKota] = useState<RegionStat[]>([]);
  const [byKecamatan, setByKecamatan] = useState<RegionStat[]>([]);
  const [byKelurahan, setByKelurahan] = useState<RegionStat[]>([]);
  const [byGender, setByGender] = useState<GenderStat[]>([]);
  const [byAgeGroup, setByAgeGroup] = useState<AgeStat[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal / Sidebar history state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ type: 'kota' | 'kecamatan' | 'kelurahan' | 'usia' | 'gender', name: string } | null>(null);
  const [groupPatients, setGroupPatients] = useState<Patient[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  const handleGroupClick = async (type: 'kota' | 'kecamatan' | 'kelurahan' | 'usia' | 'gender', name: string) => {
    if (name === 'Tidak Diketahui') return;
    setSelectedGroup({ type, name });
    setGroupLoading(true);
    
    const params: any = { limit: 100 };
    if (type === 'usia') {
      params.kelompok_usia = name;
    } else if (type === 'gender') {
      params.jenis_kelamin = name;
    } else {
      params[`${type}_nama`] = name;
    }

    try {
      const res = await api.get('/pasien', { params });
      setGroupPatients(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch group patients:', err);
    } finally {
      setGroupLoading(false);
    }
  };
  // --- NEW PASIEN LOYAL STATES & HANDLERS ---
  const [loyalPatients, setLoyalPatients] = useState<any[]>([]);
  const [loyalLoading, setLoyalLoading] = useState(false);
  
  // Selection states
  const [selectedAllTime, setSelectedAllTime] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string[]>([]);
  const [selectedRegisteredLoyal, setSelectedRegisteredLoyal] = useState<string[]>([]);
  
  // Modal states
  const [showWaModal, setShowWaModal] = useState<{ isOpen: boolean; patient: any | null; isBroadcast: boolean }>({ isOpen: false, patient: null, isBroadcast: false });
  const [waMessage, setWaMessage] = useState('');
  const [waSending, setWaSending] = useState(false);
  
  const [showHistoryModal, setShowHistoryModal] = useState<{ isOpen: boolean; patient: any | null }>({ isOpen: false, patient: null });
  const [waHistory, setWaHistory] = useState<any[]>([]);
  const [waHistoryLoading, setWaHistoryLoading] = useState(false);

  const fetchLoyalPatients = async () => {
    setLoyalLoading(true);
    try {
      const res = await api.get('/pelayanan/demografi/loyal');
      setLoyalPatients(res.data || []);
    } catch (err) {
      console.error('Failed to fetch loyal patients:', err);
    } finally {
      setLoyalLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'loyal') {
      fetchLoyalPatients();
      // Clear selections
      setSelectedAllTime([]);
      setSelectedPeriod([]);
      setSelectedRegisteredLoyal([]);
    }
  }, [activeTab]);

  const handleSetLoyalBulk = async (type: 'alltime' | 'period') => {
    const selectedIds = type === 'alltime' ? selectedAllTime : selectedPeriod;
    const listToSearch = type === 'alltime' ? topAllTime : topPeriod;
    
    if (selectedIds.length === 0) {
      Swal.fire('Perhatian', 'Pilih minimal satu pasien terlebih dahulu.', 'warning');
      return;
    }
    
    const pasien_list = listToSearch
      .filter(p => selectedIds.includes(p.no_rm))
      .map(p => ({
        no_rm: p.no_rm,
        nama: p.nama,
        no_telp: p.no_telp || '',
        total_visits: p.total_visits
      }));
      
    try {
      const { value: catatan } = await Swal.fire({
        title: 'Tetapkan Pasien Loyal',
        input: 'textarea',
        inputLabel: 'Tambahkan Catatan / Alasan',
        inputPlaceholder: 'Tulis catatan di sini...',
        inputAttributes: {
          'aria-label': 'Tulis catatan di sini'
        },
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Simpan',
        cancelButtonText: 'Batal'
      });
      
      if (catatan === undefined) return; // User cancelled
      
      Swal.fire({
        title: 'Memproses...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      await api.post('/pelayanan/demografi/loyal', {
        pasien_list,
        catatan
      });
      
      await Swal.fire('Berhasil', 'Pasien terpilih berhasil ditetapkan sebagai pasien loyal.', 'success');
      
      // Reset selections
      if (type === 'alltime') setSelectedAllTime([]);
      else setSelectedPeriod([]);
      
      // Refresh data
      fetchData();
      fetchLoyalPatients();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menetapkan pasien loyal.', 'error');
    }
  };

  const handleRemoveLoyal = async (no_rm: string) => {
    const result = await Swal.fire({
      title: 'Cabut Status Loyal?',
      text: 'Status pasien loyal akan dinonaktifkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Cabut',
      cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({
      title: 'Memproses...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      await api.delete(`/pelayanan/demografi/loyal/${no_rm}`);
      await Swal.fire('Berhasil', 'Status loyal pasien berhasil dicabut.', 'success');
      fetchData();
      fetchLoyalPatients();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mencabut status loyal.', 'error');
    }
  };

  const handleUpdatePhone = async (no_rm: string, currentPhone: string) => {
    const { value: no_telp } = await Swal.fire({
      title: 'Update Nomor Telepon',
      input: 'text',
      inputLabel: 'Nomor WhatsApp / Telepon Baru',
      inputValue: currentPhone || '',
      inputPlaceholder: 'Contoh: 081234567890',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      inputValidator: (value) => {
        if (!value) {
          return 'Nomor telepon tidak boleh kosong!';
        }
        if (!/^\+?[0-9\s\-]+$/.test(value)) {
          return 'Nomor telepon tidak valid!';
        }
      }
    });
    
    if (no_telp === undefined) return;
    
    Swal.fire({
      title: 'Menyimpan...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      await api.put(`/pasien/${no_rm}/no_telp`, { no_telp });
      await Swal.fire('Berhasil', 'Nomor telepon berhasil diperbarui.', 'success');
      fetchLoyalPatients();
      fetchData();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal memperbarui nomor telepon.', 'error');
    }
  };

  const fetchWaHistory = async (patient: any) => {
    setShowHistoryModal({ isOpen: true, patient });
    setWaHistoryLoading(true);
    try {
      const res = await api.get(`/pelayanan/demografi/loyal/${patient.pasien_no_rm || patient.no_rm}/pesan`);
      setWaHistory(res.data || []);
    } catch (err) {
      console.error('Failed to fetch WA history:', err);
    } finally {
      setWaHistoryLoading(false);
    }
  };

  const openWaModal = (patient: any, isBroadcast: boolean) => {
    const template = isBroadcast
      ? "Halo [Nama],\n\nKami dari Klinik Puri Medika mengucapkan terima kasih sebesar-besarnya atas kepercayaan Anda yang telah setia berkunjung dan memilih layanan klinik kami. Semoga Anda dan keluarga selalu sehat walafiat.\n\nSalam Hangat,\nKlinik Puri Medika"
      : `Halo ${patient.pasien_nama || patient.nama},\n\nKami dari Klinik Puri Medika mengucapkan terima kasih sebesar-besarnya atas kepercayaan Anda yang telah setia berkunjung dan memilih layanan klinik kami. Semoga Anda dan keluarga selalu sehat walafiat.\n\nSalam Hangat,\nKlinik Puri Medika`;
      
    setWaMessage(template);
    setShowWaModal({ isOpen: true, patient, isBroadcast });
  };

  const handleSendWa = async () => {
    if (!waMessage.trim()) {
      Swal.fire('Perhatian', 'Pesan WhatsApp tidak boleh kosong.', 'warning');
      return;
    }
    
    setWaSending(true);
    try {
      if (showWaModal.isBroadcast) {
        // Broadcast to selectedRegisteredLoyal
        const itemsToBroadcast = loyalPatients
          .filter(p => selectedRegisteredLoyal.includes(p.pasien_no_rm))
          .map(p => {
            const personalizedMessage = waMessage.replace(/\[Nama\]/g, p.pasien_nama);
            return {
              no_rm: p.pasien_no_rm,
              no_telp: p.no_telp,
              message: personalizedMessage
            };
          });
          
        Swal.fire({
          title: 'Mengirim Broadcast...',
          text: `Mengirim pesan ke ${itemsToBroadcast.length} pasien sekuensial. Mohon tunggu...`,
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        const res = await api.post('/pelayanan/demografi/loyal/broadcast', { items: itemsToBroadcast });
        
        await Swal.fire(
          'Broadcast Selesai',
          `Berhasil mengirim ke ${res.data.successCount} pasien.\nGagal mengirim ke ${res.data.failCount} pasien.`,
          'success'
        );
        setSelectedRegisteredLoyal([]);
      } else {
        const p = showWaModal.patient;
        Swal.fire({
          title: 'Mengirim WhatsApp...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        const res = await api.post('/pelayanan/demografi/loyal/send-whatsapp', {
          no_rm: p.pasien_no_rm || p.no_rm,
          no_telp: p.no_telp,
          message: waMessage
        });
        
        if (res.data.success) {
          await Swal.fire('Terkirim', 'Pesan WhatsApp berhasil dikirim.', 'success');
        } else {
          await Swal.fire('Gagal Kirim', `Pesan gagal terkirim via WAHA Gateway. Error: ${res.data.error || 'Unknown error'}`, 'error');
        }
      }
      
      setShowWaModal({ isOpen: false, patient: null, isBroadcast: false });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim pesan WhatsApp.', 'error');
    } finally {
      setWaSending(false);
    }
  };

  const [patientHistory, setPatientHistory] = useState<VisitHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Recharts color constants
  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pelayanan/demografi/overview', {
        params: { startDate, endDate }
      });
      setTopAllTime(res.data.topAllTime || []);
      setTopPeriod(res.data.topPeriod || []);
      setByKota(res.data.byKota || []);
      setByKecamatan(res.data.byKecamatan || []);
      setByKelurahan(res.data.byKelurahan || []);
      setByGender(res.data.byGender || []);
      setByAgeGroup(res.data.byAgeGroup || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal memuat data demografi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    setIsVisualizing(true);
    const timer = setTimeout(() => {
      setIsVisualizing(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [activeTab, startDate, endDate]);

  const fetchPatientHistory = async (patient: Patient) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/pelayanan/demografi/loyal-pasien/${patient.no_rm}`);
      setPatientHistory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper calculation for patient age
  const calculateAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return '-';
    const birthDate = new Date(birthDateStr);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' Tahun';
  };

  const filteredPatientsAllTime = topAllTime.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.no_rm.includes(searchQuery)
  );

  const filteredPatientsPeriod = topPeriod.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.no_rm.includes(searchQuery)
  );

  const totalPatients = byGender.reduce((acc, curr) => acc + curr.jumlah, 0);

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <div 
        className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100 gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-teal-600" />
            <span>Demografi Kunjungan & Pasien</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {activeTab === 'loyal' && 'Daftar pasien dengan intensitas kunjungan klinik tertinggi (All-Time & Periodik).'}
            {activeTab === 'wilayah' && 'Analisis persebaran domisili pasien berdasarkan Kabupaten/Kota, Kecamatan, dan Kelurahan.'}
            {activeTab === 'pasien' && 'Analisis statistik profil gender dan kelompok usia pasien terdaftar.'}
          </p>
        </div>

        {/* Custom Tab selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl self-start md:self-center">
            <button
              onClick={() => setActiveTab('loyal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'loyal' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Pasien Loyal
            </button>
            <button
              onClick={() => setActiveTab('wilayah')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'wilayah' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Demografi Wilayah
            </button>
            <button
              onClick={() => setActiveTab('pasien')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'pasien' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Demografi Pasien
            </button>
          </div>
        </div>
      </div>

      {loading || isVisualizing ? (
        <AnalyticLoader message="Menganalisis data demografi & memvisualisasikan data..." />
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3">
          <X className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* VIEW TAB 1: PASIEN LOYAL */}
          {activeTab === 'loyal' && (
            <motion.div
              key="loyal-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Filter & Period Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3 text-slate-850">
                    <Filter className="h-4.5 w-4.5 text-teal-600" />
                    <div>
                      <h3 className="text-sm font-bold font-display">Filter Periode Kunjungan</h3>
                      <p className="text-xs text-slate-400">Pilih rentang tanggal untuk menganalisis loyalitas kunjungan.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-100 focus:ring-1 focus:ring-teal-550 outline-none text-slate-800 bg-slate-50 font-medium"
                    />
                    <span className="text-xs text-slate-400 font-medium">s/d</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-100 focus:ring-1 focus:ring-teal-550 outline-none text-slate-800 bg-slate-50 font-medium"
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 }}
                  className="bg-white p-5 rounded-2xl shadow-xs flex items-center space-x-4"
                >
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-500">
                    <Star className="h-5 w-5 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">Pasien Loyal Terdaftar</h4>
                    <span className="text-xl font-extrabold font-display text-slate-850">
                      {loyalPatients.length} Pasien
                    </span>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 1. All-Time Top 20 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  className="bg-white rounded-2xl shadow-xs p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100/70 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-slate-850 font-display">Top 20 Pasien Terloyal (All-Time)</h2>
                          <p className="text-xs text-slate-400">Urutan pasien dengan total kunjungan kumulatif terbanyak.</p>
                        </div>
                      </div>
                      
                      {/* Compact Search */}
                      <div className="relative w-44">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari pasien..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1 text-xs w-full rounded-lg border border-slate-100 outline-none focus:ring-1 focus:ring-teal-550 bg-slate-50 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPatientsAllTime.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data pasien loyal ditemukan.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-xs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                              <th className="py-2.5 pl-2 w-10">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                                  checked={filteredPatientsAllTime.length > 0 && filteredPatientsAllTime.filter(p => !p.is_loyal).every(p => selectedAllTime.includes(p.no_rm))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const unloyalIds = filteredPatientsAllTime.filter(p => !p.is_loyal).map(p => p.no_rm);
                                      setSelectedAllTime(unloyalIds);
                                    } else {
                                      setSelectedAllTime([]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="py-2.5">Pasien</th>
                              <th className="py-2.5">No. RM</th>
                              <th className="py-2.5 text-right">Kunjungan</th>
                              <th className="py-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredPatientsAllTime.map((p, index) => (
                              <tr key={p.no_rm} className={`hover:bg-slate-50/50 transition-colors ${p.is_loyal ? 'bg-amber-50/20' : ''}`}>
                                <td className="py-2 pl-2 text-center">
                                  {p.is_loyal ? (
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-400 mx-auto" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                                      checked={selectedAllTime.includes(p.no_rm)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedAllTime(prev => [...prev, p.no_rm]);
                                        } else {
                                          setSelectedAllTime(prev => prev.filter(id => id !== p.no_rm));
                                        }
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="py-2">
                                  <div className="flex items-center space-x-2">
                                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {index + 1}
                                    </span>
                                    <div>
                                      <div className="font-semibold text-slate-850 text-xs truncate max-w-[140px]">{p.nama}</div>
                                      <span className="text-xs text-slate-400 block truncate max-w-[120px]">{p.kelurahan}, {p.kecamatan}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-mono font-medium text-slate-500">{p.no_rm}</td>
                                <td className="py-2 text-right text-xs font-bold text-slate-850 pr-2">{p.total_visits}x</td>
                                <td className="py-2 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => fetchPatientHistory(p)}
                                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center cursor-pointer"
                                      title="Lihat Riwayat Pelayanan"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                    {p.is_loyal && (
                                      <button
                                        onClick={() => handleRemoveLoyal(p.no_rm)}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center cursor-pointer"
                                        title="Cabut Status Loyal"
                                      >
                                        <UserX className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {selectedAllTime.length > 0 && (
                    <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-750">
                        {selectedAllTime.length} Pasien Terpilih
                      </span>
                      <button
                        onClick={() => handleSetLoyalBulk('alltime')}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Tetapkan Loyal
                      </button>
                    </div>
                  )}
                </motion.div>

                {/* 2. Selected Period Top 20 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.32 }}
                  className="bg-white rounded-2xl shadow-xs p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100/70 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-slate-850 font-display">Top Pasien Periode Terpilih</h2>
                          <p className="text-xs text-slate-400">Total kunjungan dalam rentang tanggal terfilter.</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPatientsPeriod.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data kunjungan pada periode terpilih.</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-xs font-bold text-slate-400 border-b border-slate-100/70 uppercase tracking-wider">
                              <th className="py-2.5 pl-2 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                                  checked={filteredPatientsPeriod.length > 0 && filteredPatientsPeriod.filter(p => !p.is_loyal).every(p => selectedPeriod.includes(p.no_rm))}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      const unloyalIds = filteredPatientsPeriod.filter(p => !p.is_loyal).map(p => p.no_rm);
                                      setSelectedPeriod(unloyalIds);
                                    } else {
                                      setSelectedPeriod([]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="py-2.5">Pasien</th>
                              <th className="py-2.5">No. RM</th>
                              <th className="py-2.5 text-right">Kunjungan</th>
                              <th className="py-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredPatientsPeriod.map((p, index) => (
                              <tr key={p.no_rm} className={`hover:bg-slate-50/50 transition-colors ${p.is_loyal ? 'bg-amber-50/20' : ''}`}>
                                <td className="py-2 pl-2 text-center">
                                  {p.is_loyal ? (
                                    <Star className="h-4 w-4 text-amber-500 fill-amber-400 mx-auto" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                                      checked={selectedPeriod.includes(p.no_rm)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPeriod(prev => [...prev, p.no_rm]);
                                        } else {
                                          setSelectedPeriod(prev => prev.filter(id => id !== p.no_rm));
                                        }
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="py-2">
                                  <div className="flex items-center space-x-2">
                                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      {index + 1}
                                    </span>
                                    <div>
                                      <div className="font-semibold text-slate-850 text-xs truncate max-w-[140px]">{p.nama}</div>
                                      <span className="text-xs text-slate-400 block truncate max-w-[120px]">{p.kelurahan}, {p.kecamatan}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-mono font-medium text-slate-500">{p.no_rm}</td>
                                <td className="py-2 text-right text-xs font-bold text-slate-850 pr-2">{p.total_visits}x</td>
                                <td className="py-2 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => fetchPatientHistory(p)}
                                      className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-550/10 transition-colors inline-flex items-center cursor-pointer"
                                      title="Lihat Riwayat Pelayanan"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                    {p.is_loyal && (
                                      <button
                                        onClick={() => handleRemoveLoyal(p.no_rm)}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center cursor-pointer"
                                        title="Cabut Status Loyal"
                                      >
                                        <UserX className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {selectedPeriod.length > 0 && (
                    <div className="mt-4 p-3 bg-teal-50/75 border border-teal-100 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-teal-850">
                        {selectedPeriod.length} Pasien Terpilih
                      </span>
                      <button
                        onClick={() => handleSetLoyalBulk('period')}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Tetapkan Loyal
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* 3. Registered Loyal Patients Panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-white rounded-2xl shadow-xs p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100/70 pb-4 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-500 shadow-xs">
                      <Star className="h-5 w-5 fill-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-850 font-display">Daftar Pasien Loyal Terdaftar</h2>
                      <p className="text-xs text-slate-400">Kelola komunikasi broadcast WhatsApp dan riwayat follow-up pasien loyal terdaftar.</p>
                    </div>
                  </div>

                  {selectedRegisteredLoyal.length > 0 && (
                    <button
                      onClick={() => openWaModal(null, true)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                    >
                      <Send className="h-4 w-4" />
                      Kirim Broadcast WA ({selectedRegisteredLoyal.length})
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {loyalLoading ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                      <span className="text-xs text-slate-400 mt-2 block">Memuat daftar pasien loyal...</span>
                    </div>
                  ) : loyalPatients.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">Belum ada pasien loyal yang terdaftar secara aktif.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-xs font-bold text-slate-400 border-b border-slate-100/70 uppercase tracking-wider">
                          <th className="py-2.5 pl-2 w-10 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                              checked={loyalPatients.length > 0 && loyalPatients.every(p => selectedRegisteredLoyal.includes(p.pasien_no_rm))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRegisteredLoyal(loyalPatients.map(p => p.pasien_no_rm));
                                } else {
                                  setSelectedRegisteredLoyal([]);
                                }
                              }}
                            />
                          </th>
                          <th className="py-2.5">Pasien</th>
                          <th className="py-2.5">No. WhatsApp</th>
                          <th className="py-2.5">Snapshot Kunjungan</th>
                          <th className="py-2.5">Tanggal Terdaftar</th>
                          <th className="py-2.5">Alasan/Catatan</th>
                          <th className="py-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {loyalPatients.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-550 h-3.5 w-3.5 cursor-pointer"
                                checked={selectedRegisteredLoyal.includes(p.pasien_no_rm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRegisteredLoyal(prev => [...prev, p.pasien_no_rm]);
                                  } else {
                                    setSelectedRegisteredLoyal(prev => prev.filter(id => id !== p.pasien_no_rm));
                                  }
                                }}
                              />
                            </td>
                            <td className="py-3">
                              <div>
                                <span className="font-semibold text-slate-850 text-xs block">{p.pasien_nama}</span>
                                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-500 border border-slate-200 inline-block mt-0.5">
                                  RM: {p.pasien_no_rm}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-mono font-medium text-slate-700">{p.no_telp || '-'}</span>
                                <button
                                  onClick={() => handleUpdatePhone(p.pasien_no_rm, p.no_telp)}
                                  className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-teal-550/10 transition-colors cursor-pointer"
                                  title="Edit Nomor Telepon"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 text-xs font-semibold text-slate-850">
                              {p.total_visits_snapshot} Kunjungan
                            </td>
                            <td className="py-3 text-xs font-medium text-slate-500">
                              {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="py-3 text-xs text-slate-500 max-w-[180px] truncate" title={p.catatan}>
                              {p.catatan || '-'}
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => openWaModal(p, false)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors inline-flex items-center cursor-pointer"
                                  title="Kirim WhatsApp"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => fetchWaHistory(p)}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors inline-flex items-center cursor-pointer"
                                  title="Riwayat Pesan"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveLoyal(p.pasien_no_rm)}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors inline-flex items-center cursor-pointer"
                                  title="Cabut Status Loyal"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* VIEW TAB 2: DEMOGRAFI WILAYAH */}
          {activeTab === 'wilayah' && (
            <motion.div
              key="wilayah-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Regional Cards Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                  className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center space-x-4 relative overflow-hidden group"
                >
                  <div className="p-3 rounded-xl bg-white/20 text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-white/80 font-bold">Total Wilayah Kota</h4>
                    <span className="text-xl font-extrabold font-display text-white">
                      {byKota.filter(c => c.kota !== 'Tidak Diketahui').length} Kota/Kab
                    </span>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.3, delay: 0.16 }}
                  className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center space-x-4 relative overflow-hidden group"
                >
                  <div className="p-3 rounded-xl bg-white/20 text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-white/80 font-bold">Total Kecamatan</h4>
                    <span className="text-xl font-extrabold font-display text-white">
                      {byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').length} Kecamatan
                    </span>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.3, delay: 0.24 }}
                  className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center space-x-4 relative overflow-hidden group"
                >
                  <div className="p-3 rounded-xl bg-white/20 text-white">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-white/80 font-bold">Total Kelurahan</h4>
                    <span className="text-xl font-extrabold font-display text-white">
                      {byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').length} Kelurahan
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Chart Persebaran Pasien */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.32 }}
                  className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-850 font-display">Grafik Pasien & Kunjungan Berdasarkan Kota/Kabupaten</h2>
                      <p className="text-xs text-slate-400">Membandingkan jumlah pasien terdaftar (Bar) dengan total kunjungan (Line).</p>
                    </div>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byKota.filter(c => c.kota !== 'Tidak Diketahui')}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="kota" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="jumlah_kunjungan" name="Total Kunjungan" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Table Data list */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Data Populasi Wilayah (Kota)</h3>
                    <p className="text-xs text-slate-400">Detail rincian pasien per domisili kabupaten/kota.</p>
                  </div>
                  <div className="overflow-y-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="py-2">Kabupaten / Kota</th>
                          <th className="py-2 text-right">Pasien</th>
                          <th className="py-2 text-right">Kunjungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-55">
                        {byKota.map((item, index) => (
                          <tr key={index} className={`hover:bg-slate-50/40 ${item.kota !== 'Tidak Diketahui' ? 'cursor-pointer' : ''}`} onClick={() => item.kota && handleGroupClick('kota', item.kota)}>
                            <td className="py-2 font-medium text-slate-700 hover:text-teal-600 transition-colors">{item.kota}</td>
                            <td className="py-2 text-right text-slate-600 font-bold">{item.jumlah_pasien}</td>
                            <td className="py-2 text-right text-slate-600 font-bold">{item.jumlah_kunjungan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>

              {/* Sub-Region Analysis by Kecamatan and Kelurahan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.48 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850 font-display">Sebaran Pasien di Tingkat Kecamatan</h3>
                      <p className="text-xs text-slate-400 font-medium text-slate-500">Kecamatan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis type="category" dataKey="kecamatan" stroke="#94a3b8" fontSize={12} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} onClick={(data: any) => data?.kecamatan && handleGroupClick('kecamatan', data.kecamatan)} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.56 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850 font-display">Sebaran Pasien di Tingkat Kelurahan</h3>
                      <p className="text-xs text-slate-400 font-medium text-slate-500">Kelurahan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis type="category" dataKey="kelurahan" stroke="#94a3b8" fontSize={12} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} onClick={(data: any) => data?.kelurahan && handleGroupClick('kelurahan', data.kelurahan)} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* VIEW TAB 3: DEMOGRAFI PASIEN */}
          {activeTab === 'pasien' && (
            <motion.div
              key="pasien-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gender Distribution Pie Chart */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Proporsi Gender Pasien</h3>
                    <p className="text-xs text-slate-400">Pembagian jumlah pasien terdaftar berdasarkan jenis kelamin.</p>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byGender}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="jumlah"
                          nameKey="jenis_kelamin"
                          onClick={(data: any) => data?.name && handleGroupClick('gender', data.name)}
                          cursor="pointer"
                        >
                          {byGender.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} Pasien`} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary of gender numeric data */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    {byGender.map((item, index) => (
                      <div key={index} className="text-center">
                        <span className="text-xs text-slate-400 font-bold block">{item.jenis_kelamin}</span>
                        <span className="text-base font-extrabold text-slate-850">
                          {item.jumlah} <span className="text-xs text-slate-400 font-normal">({totalPatients > 0 ? ((item.jumlah / totalPatients) * 100).toFixed(1) : 0}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Age Group Distribution */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 }}
                  className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100/80 shadow-sm space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Distribusi Berdasarkan Kelompok Usia</h3>
                    <p className="text-xs text-slate-400">Pengelompokan usia klinis pasien terdaftar di database.</p>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byAgeGroup}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="kelompok_usia" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="jumlah" name="Jumlah Pasien" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={34} onClick={(data: any) => data?.kelompok_usia && handleGroupClick('usia', data.kelompok_usia)} cursor="pointer">
                          {byAgeGroup.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Patient Insight Summary Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.24 }}
                className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6"
              >
                <div className="space-y-1 relative z-10">
                  <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
                    Insight Demografi Pasien
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Berdasarkan visualisasi sebaran pasien, kelompok umur <span className="text-teal-700 font-semibold">{[...byAgeGroup].sort((a,b) => b.jumlah - a.jumlah)[0]?.kelompok_usia || 'Tidak Diketahui'}</span> merupakan populasi pasien tertinggi di Klinik Puri Medika. Dominasi gender adalah <span className="text-teal-700 font-semibold">{[...byGender].sort((a,b) => b.jumlah - a.jumlah)[0]?.jenis_kelamin || 'Tidak Diketahui'}</span>.
                  </p>
                </div>
                <div className="bg-white border border-teal-100 rounded-xl px-5 py-3 relative z-10 text-center flex-shrink-0 min-w-[160px] shadow-xs">
                  <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Total Pasien Terdaftar</span>
                  <span className="text-2xl font-black text-teal-600">{totalPatients} Jiwa</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Modal Pasien per Wilayah */}
      {createPortal(
        <AnimatePresence>
          {selectedGroup && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" style={{ pointerEvents: 'auto' }}>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setSelectedGroup(null)}
              />
              <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-display text-slate-800">
                      Data Pasien
                    </h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                      {selectedGroup.type === 'kota' ? 'Kota/Kabupaten' : selectedGroup.type === 'kecamatan' ? 'Kecamatan' : selectedGroup.type === 'kelurahan' ? 'Kelurahan' : selectedGroup.type === 'gender' ? 'Jenis Kelamin' : 'Kelompok Usia'}: {selectedGroup.name}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {groupLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
                    <p className="text-sm text-slate-500">Memuat data pasien...</p>
                  </div>
                ) : groupPatients.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Tidak ada pasien ditemukan di kelompok ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <th className="py-3 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">No. RM</th>
                          <th className="py-3 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Nama Pasien</th>
                          <th className="py-3 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">L/P</th>
                          <th className="py-3 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Usia</th>
                          <th className="py-3 px-4 font-bold text-slate-600 text-xs uppercase tracking-wider">Alamat Lengkap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupPatients.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 text-slate-500 font-mono text-xs">{p.no_rm}</td>
                            <td className="py-3 px-4 font-bold text-slate-800">{p.nama}</td>
                            <td className="py-3 px-4 text-slate-600">{p.jenis_kelamin}</td>
                            <td className="py-3 px-4 text-slate-600 text-xs">
                              {p.tanggal_lahir ? Math.floor((new Date().getTime() - new Date(p.tanggal_lahir).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' thn' : '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-xs truncate max-w-[200px]" title={p.alamat || '-'}>{p.alamat || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Patient History Modal Side-Drawer */}
      {createPortal(
      <AnimatePresence>
        {selectedPatient && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatient(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] pointer-events-auto"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-slate-800 shadow-2xl z-[10000] border-l border-slate-200 flex flex-col pointer-events-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-teal-50 border border-teal-150 flex items-center justify-center font-bold text-teal-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">Profil & Riwayat Pasien</h3>
                    <span className="text-xs text-teal-600 font-mono">No. RM: {selectedPatient.no_rm}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Patient Basic Profile details */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-200 space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-teal-650 font-bold">Informasi Demografis</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-550">
                  <div>
                    <span className="text-slate-450 block">Nama Pasien</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.nama}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Jenis Kelamin</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : selectedPatient.jenis_kelamin === 'P' ? 'Perempuan' : selectedPatient.jenis_kelamin}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Kelompok Usia (Lahir)</span>
                    <span className="text-slate-800 text-xs font-semibold">{calculateAge(selectedPatient.tanggal_lahir)}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Wilayah Domisili</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.kota}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-450 block">Alamat Lengkap</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.alamat}</span>
                  </div>
                </div>
              </div>

              {/* History Timeline of Visits */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-teal-650 font-bold">Daftar Kunjungan All-Time</h4>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-550 text-teal-750 border border-teal-150">
                    {selectedPatient.total_visits} Kali
                  </span>
                </div>

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    <span className="text-xs text-slate-400 mt-2">Memuat riwayat...</span>
                  </div>
                ) : patientHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-550 font-medium">Belum ada catatan riwayat kunjungan pelayanan.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {patientHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-7 group">
                        {/* Timeline node */}
                        <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-white border-2 border-teal-500 group-hover:bg-teal-500 transition-colors" />
                        
                        <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors p-4 rounded-xl border border-slate-200/85 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-slate-550 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {item.tanggal_pelayanan}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              item.tipe === 'Rawat Jalan' ? 'bg-teal-50 text-teal-700 border-teal-150' :
                              item.tipe === 'IGD' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                              'bg-indigo-50 text-indigo-700 border-indigo-150'
                            }`}>
                              {item.tipe}
                            </span>
                          </div>

                          <div className="text-xs font-medium">
                            <span className="text-slate-400 block">DPJP / Dokter Pelaksana</span>
                            <span className="text-slate-700 font-semibold">{item.dpjp}</span>
                          </div>

                          <div className="text-xs font-medium bg-white p-2 rounded-lg border border-slate-200/70">
                            <span className="text-slate-400 block">Diagnosa ICD-10</span>
                            <span className="text-slate-600 font-mono font-medium">{item.icd}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* WhatsApp Message Modal */}
      {createPortal(
      <AnimatePresence>
        {showWaModal.isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWaModal({ isOpen: false, patient: null, isBroadcast: false })}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[19999] pointer-events-auto"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto max-w-lg h-fit bg-white rounded-2xl shadow-2xl z-[20000] border border-slate-200 flex flex-col p-6 space-y-4 pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-slate-850">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-display">
                      {showWaModal.isBroadcast ? 'Broadcast WhatsApp Pasien Loyal' : 'Kirim WhatsApp Pasien'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {showWaModal.isBroadcast 
                        ? `Akan dikirim ke ${selectedRegisteredLoyal.length} pasien secara berurutan.`
                        : `Kirim ke: ${showWaModal.patient?.pasien_nama} (${showWaModal.patient?.no_telp || '-'})`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWaModal({ isOpen: false, patient: null, isBroadcast: false })}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-450 font-bold block">Pesan WhatsApp</label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full text-xs p-3 rounded-xl border border-slate-250 focus:ring-1 focus:ring-emerald-550 focus:border-emerald-550 outline-none bg-slate-50 text-slate-800 font-medium font-sans"
                  placeholder="Tulis pesan Anda di sini..."
                />
                {showWaModal.isBroadcast && (
                  <p className="text-xs text-slate-400">
                    <span className="font-semibold text-teal-600">Info:</span> Gunakan tag <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-teal-700">[Nama]</code> untuk menyisipkan nama masing-masing pasien secara dinamis saat broadcast.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWaModal({ isOpen: false, patient: null, isBroadcast: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={waSending}
                  onClick={handleSendWa}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  {waSending ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Kirim Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* WhatsApp Message Logs History Modal */}
      {createPortal(
      <AnimatePresence>
        {showHistoryModal.isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryModal({ isOpen: false, patient: null })}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[19999] pointer-events-auto"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-slate-800 shadow-2xl z-[20000] border-l border-slate-200 flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">Riwayat WhatsApp Pasien</h3>
                    <span className="text-xs text-indigo-600 font-mono">Pasien: {showHistoryModal.patient?.pasien_nama || showHistoryModal.patient?.nama}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal({ isOpen: false, patient: null })}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Logs Content List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                {waHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    <span className="text-xs text-slate-400 mt-2 block">Memuat riwayat pesan...</span>
                  </div>
                ) : waHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-medium">Belum ada riwayat pesan WhatsApp yang terekam untuk pasien ini.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {waHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-7 group">
                        {/* Timeline node */}
                        <div className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-white border-2 ${item.status === 'success' ? 'border-emerald-500' : 'border-rose-500'}`} />
                        
                        <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors p-4 rounded-xl border border-slate-200/85 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-slate-550 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {new Date(item.sent_at).toLocaleString('id-ID')}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                              item.status === 'success' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                : 'bg-rose-50 text-rose-700 border-rose-150'
                            }`}>
                              {item.status === 'success' ? 'Terkirim' : 'Gagal'}
                            </span>
                          </div>

                          <div className="text-xs font-medium text-slate-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200/75">
                            {item.message}
                          </div>

                          <div className="text-xs text-slate-400 font-medium text-right">
                            Dikirim oleh: <span className="font-semibold text-slate-600">{item.sender_username || 'System'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
