import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import PageHeader from '../../components/PageHeader.js';
import { 
  Users, 
  MapPin, 
  PieChart as ChartIcon, 
  Search, 
  Calendar, 
  ChevronRight,
  ChevronLeft,
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
  Square,
  Upload,
  Wallet
} from 'lucide-react';
import Swal from '../../utils/swal.js';
import api from '../../services/api.js';
import { useRecharts } from '../../components/RechartsLoader.js';
import AnalyticLoader from '../../components/AnalyticLoader.js';
import { parseTagihanText, formatRupiah, TagihanRow } from '../../utils/tagihanParser.js';
import { formatTanggalIndo } from '../../utils/dateFormat.js';

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
  total_tagihan?: number;
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
  tagihan?: number | string | null;
  [komponen: string]: any;
}

export default React.memo(function DemografiKunjungan() {
  const recharts = useRecharts();
  const ResponsiveContainer = recharts?.ResponsiveContainer;
  const BarChart = recharts?.BarChart;
  const Bar = recharts?.Bar;
  const XAxis = recharts?.XAxis;
  const YAxis = recharts?.YAxis;
  const Tooltip = recharts?.Tooltip;
  const CartesianGrid = recharts?.CartesianGrid;
  const PieChart = recharts?.PieChart;
  const Pie = recharts?.Pie;
  const Cell = recharts?.Cell;
  const Legend = recharts?.Legend;
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
  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [tagihanListLoading, setTagihanListLoading] = useState(false);
  const [tagihanPage, setTagihanPage] = useState(1);
  const TAGIHAN_PER_PAGE = 10;
  
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

  // --- IMPORT TAGIHAN ---
  const [showImportTagihan, setShowImportTagihan] = useState(false);
  const [tagihanText, setTagihanText] = useState('');
  const [tagihanPreview, setTagihanPreview] = useState<TagihanRow[] | null>(null);
  const [tagihanSaving, setTagihanSaving] = useState(false);

  const closeImportTagihan = () => {
    setShowImportTagihan(false);
    setTagihanText('');
    setTagihanPreview(null);
  };

  const handleSaveTagihan = async () => {
    const rows = (tagihanPreview || []).filter(r => !r.error);
    if (rows.length === 0) return;
    setTagihanSaving(true);
    try {
      const res = await api.post('/tagihan-pasien/import', { rows });
      const { inserted, updated, errors, tidak_ditemukan } = res.data;
      const extra = [
        tidak_ditemukan?.length ? `${tidak_ditemukan.length} no. registrasi belum ada di data registrasi (tetap disimpan tanpa relasi)` : '',
        errors?.length ? `${errors.length} baris ditolak server` : ''
      ].filter(Boolean).join('<br/>');
      await Swal.fire({
        icon: 'success',
        title: 'Import selesai',
        html: `${inserted} baru, ${updated} diperbarui.${extra ? '<br/>' + extra : ''}`
      });
      closeImportTagihan();
      if (selectedPatient) fetchPatientHistory(selectedPatient);
      if (activeTab === 'loyal') { fetchLoyalPatients(); fetchTagihanList(); }
    } catch (err: any) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan data tagihan.', 'error');
    } finally {
      setTagihanSaving(false);
    }
  };

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

  const fetchTagihanList = async () => {
    setTagihanListLoading(true);
    try {
      const res = await api.get('/tagihan-pasien');
      setTagihanList(res.data || []);
      setTagihanPage(1);
    } catch (err) {
      console.error('Failed to fetch tagihan list:', err);
    } finally {
      setTagihanListLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'loyal') {
      fetchLoyalPatients();
      fetchTagihanList();
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
      title: 'Hapus Pasien Loyal?',
      text: 'Data pasien akan dihapus dari daftar pasien loyal.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    Swal.fire({
      title: 'Menghapus...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    try {
      await api.delete(`/pelayanan/demografi/loyal/${no_rm}`);
      await Swal.fire('Berhasil', 'Data pasien loyal berhasil dihapus dari database.', 'success');
      setLoyalPatients(prev => prev.filter(p => String(p.pasien_no_rm || p.no_rm) !== String(no_rm)));
      setSelectedRegisteredLoyal(prev => prev.filter(id => id !== no_rm));
      setSelectedAllTime(prev => prev.filter(id => id !== no_rm));
      setSelectedPeriod(prev => prev.filter(id => id !== no_rm));
      fetchData();
      fetchLoyalPatients();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menghapus data pasien loyal.', 'error');
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

  // Recharts color constants (Slate & Ice v2.0)
  const COLORS = ['#213145', '#7CA3CC', '#FF8574', '#475569', '#3B82F6', '#94A3B8', '#F97316'];

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

  const currentSubtitle =
    activeTab === 'loyal'
      ? 'Daftar pasien dengan intensitas kunjungan klinik tertinggi (All-Time & Periodik).'
      : activeTab === 'wilayah'
      ? 'Analisis persebaran domisili pasien berdasarkan Kabupaten/Kota, Kecamatan, dan Kelurahan.'
      : 'Analisis statistik profil gender dan kelompok usia pasien terdaftar.';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demografi Kunjungan & Pasien"
        subtitle={currentSubtitle}
      />

      {/* Tab Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFF4FF] rounded-xl border border-[#E5EEFF] self-start">
          <button
            onClick={() => setActiveTab('loyal')}
            className={`px-4 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'loyal'
                ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
            }`}
            style={{ minHeight: '36px' }}
          >
            Pasien Loyal
          </button>
          <button
            onClick={() => setActiveTab('wilayah')}
            className={`px-4 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'wilayah'
                ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
            }`}
            style={{ minHeight: '36px' }}
          >
            Demografi Wilayah
          </button>
          <button
            onClick={() => setActiveTab('pasien')}
            className={`px-4 py-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'pasien'
                ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
            }`}
            style={{ minHeight: '36px' }}
          >
            Demografi Pasien
          </button>
        </div>

        {activeTab === 'loyal' && (
          <button
            onClick={() => setShowImportTagihan(true)}
            className="si-btn si-btn--primary text-xs font-semibold px-4 rounded-xl cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
            style={{ height: '40px' }}
          >
            <Upload className="h-4 w-4 text-[#CCDCEF]" />
            <span>Import Tagihan</span>
          </button>
        )}
      </div>

      {loading || isVisualizing ? (
        <AnalyticLoader message="Menganalisis data demografi & memvisualisasikan data..." />
      ) : error ? (
        <div className="bg-[#FF8574]/15 border border-[#FF8574]/40 text-[#222526] p-4 rounded-xl flex items-center space-x-3">
          <X className="h-5 w-5 text-[#D94E3B] flex-shrink-0" />
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="lg:col-span-2 si-card bg-white p-5 rounded-2xl shadow-[0_6px_24px_rgba(33,49,69,0.06)] border border-[#E5EEFF] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3 text-[#0B1C30]">
                    <div className="w-10 h-10 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center shrink-0">
                      <Filter className="h-5 w-5 text-[#213145]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-display text-[#0B1C30]">Filter Periode Kunjungan</h3>
                      <p className="text-xs text-[#516070]">Pilih rentang tanggal untuk menganalisis loyalitas kunjungan.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] focus:outline-none focus:ring-2 focus:ring-[#CCDCEF] text-[#0B1C30] bg-[#EFF4FF] font-medium transition-all"
                    />
                    <span className="text-xs text-[#74777C] font-medium">s/d</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] focus:outline-none focus:ring-2 focus:ring-[#CCDCEF] text-[#0B1C30] bg-[#EFF4FF] font-medium transition-all"
                    />
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="si-card bg-white p-5 rounded-2xl shadow-[0_6px_24px_rgba(33,49,69,0.06)] border border-[#E5EEFF] flex items-center space-x-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFE9E5] text-[#FF8574] flex items-center justify-center shrink-0">
                    <Star className="h-6 w-6 fill-[#FF8574]" />
                  </div>
                  <div>
                    <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase block">
                      PASIEN LOYAL TERDAFTAR
                    </span>
                    <span className="si-metric text-2xl font-extrabold font-display text-[#0B1C30] block mt-0.5 tabular-nums">
                      {loyalPatients.length} Pasien
                    </span>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 1. All-Time Top 20 */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                  className="si-card bg-white p-6 rounded-2xl shadow-[0_6px_24px_rgba(33,49,69,0.06)] border border-[#E5EEFF] space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5EEFF] pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E5EEFF] text-[#213145] flex items-center justify-center shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#0B1C30] font-display">Top 20 Pasien Terloyal (All-Time)</h2>
                          <p className="text-xs text-[#516070]">Urutan pasien dengan total kunjungan kumulatif terbanyak.</p>
                        </div>
                      </div>
                      
                      {/* Compact Search */}
                      <div className="relative w-44">
                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#74777C]" />
                        <input
                          type="text"
                          placeholder="Cari pasien..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 pr-3 py-1 text-xs w-full rounded-lg border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] outline-none focus:ring-2 focus:ring-[#CCDCEF] bg-[#EFF4FF] text-[#0B1C30] transition-all"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPatientsAllTime.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data pasien loyal ditemukan.</div>
                      ) : (
                        <table className="si-table w-full text-left">
                          <thead>
                            <tr>
                              <th className="py-2.5 pl-2 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                              <th className="py-2.5 text-right">Total Tagihan</th>
                              <th className="py-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5EEFF]">
                            {filteredPatientsAllTime.map((p, index) => (
                              <tr key={p.no_rm} className={`hover:bg-[#F8F9FF] transition-colors ${p.is_loyal ? 'bg-[#CCDCEF]/15' : ''}`}>
                                <td className="py-2 pl-2 text-center">
                                  {p.is_loyal ? (
                                    <Star className="h-4 w-4 text-[#213145] fill-[#213145] mx-auto" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-[#213145] text-white' : 'bg-[#CCDCEF]/50 text-[#213145]'}`}>
                                      {index + 1}
                                    </span>
                                    <div>
                                      <div className="font-semibold text-[#213145] text-xs truncate max-w-[140px]">{p.nama}</div>
                                      <span className="text-xs text-[#667085] block truncate max-w-[120px]">{p.kelurahan}, {p.kecamatan}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-mono font-medium text-[#667085]">{p.no_rm}</td>
                                <td className="py-2 text-right text-xs font-bold text-[#213145]">{p.total_visits}x</td>
                                <td className="py-2 text-right text-xs font-semibold text-[#213145] font-mono whitespace-nowrap">
                                  {formatRupiah(p.total_tagihan || 0)}
                                </td>
                                <td className="py-2 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => fetchPatientHistory(p)}
                                      className="p-1 rounded-md text-[#667085] hover:text-[#213145] hover:bg-[#CCDCEF]/40 transition-colors inline-flex items-center cursor-pointer"
                                      title="Lihat Riwayat Pelayanan"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                    {p.is_loyal && (
                                      <button
                                        onClick={() => handleRemoveLoyal(p.no_rm)}
                                        className="p-1 rounded-md text-[#667085] hover:text-[#222526] hover:bg-[#FF8574]/20 transition-colors inline-flex items-center cursor-pointer"
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
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="si-card bg-white p-6 rounded-2xl shadow-[0_6px_24px_rgba(33,49,69,0.06)] border border-[#E5EEFF] space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5EEFF] pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E5EEFF] text-[#213145] flex items-center justify-center shrink-0">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h2 className="text-sm font-bold text-[#0B1C30] font-display">Top Pasien Periode Terpilih</h2>
                          <p className="text-xs text-[#516070]">Total kunjungan dalam rentang tanggal terfilter.</p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPatientsPeriod.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data kunjungan pada periode terpilih.</div>
                      ) : (
                        <table className="si-table w-full text-left">
                          <thead>
                            <tr>
                              <th className="py-2.5 pl-2 w-10 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                              <th className="py-2.5 text-right">Total Tagihan</th>
                              <th className="py-2.5 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5EEFF]">
                            {filteredPatientsPeriod.map((p, index) => (
                              <tr key={p.no_rm} className={`hover:bg-[#F8F9FF] transition-colors ${p.is_loyal ? 'bg-[#CCDCEF]/15' : ''}`}>
                                <td className="py-2 pl-2 text-center">
                                  {p.is_loyal ? (
                                    <Star className="h-4 w-4 text-[#213145] fill-[#213145] mx-auto" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                                    <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-[#213145] text-white' : 'bg-[#CCDCEF]/50 text-[#213145]'}`}>
                                      {index + 1}
                                    </span>
                                    <div>
                                      <div className="font-semibold text-[#213145] text-xs truncate max-w-[140px]">{p.nama}</div>
                                      <span className="text-xs text-[#667085] block truncate max-w-[120px]">{p.kelurahan}, {p.kecamatan}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 text-xs font-mono font-medium text-[#667085]">{p.no_rm}</td>
                                <td className="py-2 text-right text-xs font-bold text-[#213145]">{p.total_visits}x</td>
                                <td className="py-2 text-right text-xs font-semibold text-[#213145] font-mono whitespace-nowrap">
                                  {formatRupiah(p.total_tagihan || 0)}
                                </td>
                                <td className="py-2 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() => fetchPatientHistory(p)}
                                      className="p-1 rounded-md text-[#667085] hover:text-[#213145] hover:bg-[#CCDCEF]/40 transition-colors inline-flex items-center cursor-pointer"
                                      title="Lihat Riwayat Pelayanan"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                    {p.is_loyal && (
                                      <button
                                        onClick={() => handleRemoveLoyal(p.no_rm)}
                                        className="p-1 rounded-md text-[#667085] hover:text-[#222526] hover:bg-[#FF8574]/20 transition-colors inline-flex items-center cursor-pointer"
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
                    <div className="mt-4 p-3.5 bg-[#CCDCEF]/30 border border-[#CCDCEF] rounded-xl flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#213145]">
                        {selectedPeriod.length} Pasien Terpilih
                      </span>
                      <button
                        onClick={() => handleSetLoyalBulk('period')}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#213145] hover:bg-[#122030] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
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
                className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E5EEFF] pb-4 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-[#CCDCEF]/60 flex items-center justify-center border border-[#CCDCEF] text-[#213145] shadow-xs">
                      <Star className="h-5 w-5 fill-[#213145]" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#213145] font-display">Daftar Pasien Loyal Terdaftar</h2>
                      <p className="text-xs text-[#667085]">Kelola komunikasi broadcast WhatsApp dan riwayat follow-up pasien loyal terdaftar.</p>
                    </div>
                  </div>

                  {selectedRegisteredLoyal.length > 0 && (
                    <button
                      onClick={() => openWaModal(null, true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#213145] hover:bg-[#122030] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                    >
                      <Send className="h-4 w-4" />
                      Kirim Broadcast WA ({selectedRegisteredLoyal.length})
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {loyalLoading ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#213145] mx-auto"></div>
                      <span className="text-xs text-[#667085] mt-2 block">Memuat daftar pasien loyal...</span>
                    </div>
                  ) : loyalPatients.length === 0 ? (
                    <div className="py-12 text-center text-[#667085] text-xs">Belum ada pasien loyal yang terdaftar secara aktif.</div>
                  ) : (
                    <table className="si-table w-full text-left">
                      <thead>
                        <tr>
                          <th className="py-2.5 pl-2 w-10 text-center">
                            <input
                              type="checkbox"
                              className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                          <th className="py-2.5 text-right">Nominal Tagihan</th>
                          <th className="py-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EEFF]">
                        {loyalPatients.map((p) => (
                          <tr key={p.id} className="hover:bg-[#F8F9FF] transition-colors">
                            <td className="py-3 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-[#CCDCEF] text-[#213145] focus:ring-[#213145] h-3.5 w-3.5 cursor-pointer"
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
                                <span className="font-semibold text-[#213145] text-xs block">{p.pasien_nama}</span>
                                <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium bg-[#CCDCEF]/30 text-[#213145] border border-[#CCDCEF] inline-block mt-0.5">
                                  RM: {p.pasien_no_rm}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-xs font-mono font-medium text-[#222526]">{p.no_telp || '-'}</span>
                                <button
                                  onClick={() => handleUpdatePhone(p.pasien_no_rm, p.no_telp)}
                                  className="p-1 rounded text-[#667085] hover:text-[#213145] hover:bg-[#CCDCEF]/40 transition-colors cursor-pointer"
                                  title="Edit Nomor Telepon"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 text-xs font-semibold text-[#213145]">
                              {p.total_kunjungan_snapshot || p.total_visits_snapshot || p.total_visits || 0} Kunjungan
                            </td>
                            <td className="py-3 text-xs font-medium text-[#667085]">
                              {new Date(p.tanggal_ditetapkan || p.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="py-3 text-xs text-[#667085] max-w-[180px] truncate" title={p.catatan}>
                              {p.catatan || '-'}
                            </td>
                            <td className="py-3 text-right text-xs font-mono font-semibold tabular-nums text-[#213145]">
                              {Number(p.total_tagihan) > 0 ? formatRupiah(p.total_tagihan) : '-'}
                            </td>
                            <td className="py-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => openWaModal(p, false)}
                                  className="p-1.5 rounded-lg bg-[#CCDCEF]/50 text-[#213145] hover:bg-[#CCDCEF] transition-colors inline-flex items-center cursor-pointer"
                                  title="Kirim WhatsApp"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => fetchWaHistory(p)}
                                  className="p-1.5 rounded-lg bg-[#F8F9FF] text-[#667085] hover:bg-[#E5EEFF] transition-colors inline-flex items-center cursor-pointer"
                                  title="Riwayat Pesan"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRemoveLoyal(p.pasien_no_rm)}
                                  className="p-1.5 rounded-lg bg-[#FF8574]/20 text-[#222526] hover:bg-[#FF8574]/40 transition-colors inline-flex items-center cursor-pointer"
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

              {/* Data Tagihan Pasien */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-[#E5EEFF] pb-4 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-[#CCDCEF]/60 flex items-center justify-center border border-[#CCDCEF] text-[#213145] shadow-xs">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-[#213145] font-display">Data Tagihan Pasien</h2>
                      <p className="text-xs text-[#667085]">Nominal tagihan per registrasi hasil import, diurutkan dari terbesar.</p>
                    </div>
                  </div>
                  {tagihanList.length > 0 && (
                    <span className="text-xs font-mono tabular-nums font-bold text-[#213145] px-2.5 py-1 rounded-lg bg-[#CCDCEF]/40 border border-[#CCDCEF]">
                      Total {formatRupiah(tagihanList.reduce((a, t) => a + Number(t.tagihan || 0), 0))}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {tagihanListLoading ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#213145] mx-auto"></div>
                      <span className="text-xs text-[#667085] mt-2 block">Memuat data tagihan...</span>
                    </div>
                  ) : tagihanList.length === 0 ? (
                    <div className="py-12 text-center text-[#667085] text-xs">Belum ada data tagihan. Gunakan tombol Import Tagihan di atas.</div>
                  ) : (
                    <table className="si-table w-full text-left">
                      <thead>
                        <tr>
                          <th className="py-2.5">No. Registrasi</th>
                          <th className="py-2.5">Pasien</th>
                          <th className="py-2.5">Unit</th>
                          <th className="py-2.5">Penanggung</th>
                          <th className="py-2.5 text-right">Nominal Tagihan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EEFF]">
                        {tagihanList.slice((tagihanPage - 1) * TAGIHAN_PER_PAGE, tagihanPage * TAGIHAN_PER_PAGE).map((t, idx) => (
                          <tr key={`${t.no_registrasi}-${idx}`} className="hover:bg-[#F8F9FF] transition-colors">
                            <td className="py-3 text-xs font-mono font-medium text-[#667085]">{t.no_registrasi}</td>
                            <td className="py-3 text-xs">
                              <span className="font-semibold text-[#213145] block">{t.nama_pasien || '-'}</span>
                              {t.pasien_no_rm && <span className="text-[#667085] font-mono">RM: {t.pasien_no_rm}</span>}
                            </td>
                            <td className="py-3 text-xs text-[#667085]">{t.unit || '-'}</td>
                            <td className="py-3 text-xs text-[#667085]">{t.penanggung || '-'}</td>
                            <td className="py-3 text-right text-xs font-mono font-semibold tabular-nums text-[#213145]">{formatRupiah(t.tagihan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {tagihanList.length > TAGIHAN_PER_PAGE && (
                  <div className="flex items-center justify-between border-t border-[#E5EEFF] pt-4">
                    <button
                      onClick={() => setTagihanPage(prev => Math.max(prev - 1, 1))}
                      disabled={tagihanPage === 1}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#222526] bg-white border border-[#CCDCEF] rounded-lg disabled:opacity-40 hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                    <span className="text-xs font-medium text-[#667085]">
                      Halaman {tagihanPage} dari {Math.ceil(tagihanList.length / TAGIHAN_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setTagihanPage(prev => Math.min(prev + 1, Math.ceil(tagihanList.length / TAGIHAN_PER_PAGE)))}
                      disabled={tagihanPage >= Math.ceil(tagihanList.length / TAGIHAN_PER_PAGE)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#222526] bg-white border border-[#CCDCEF] rounded-lg disabled:opacity-40 hover:bg-[#F8F9FF] cursor-pointer transition-colors"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
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
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3, delay: 0.08 }}
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-5 flex items-center space-x-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#CCDCEF]/60 border border-[#CCDCEF] text-[#213145] flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#667085] font-bold">Total Wilayah Kota</h4>
                    <span className="text-2xl font-bold font-display text-[#213145]">
                      {byKota.filter(c => c.kota !== 'Tidak Diketahui').length} <span className="text-xs font-semibold text-[#667085]">Kota/Kab</span>
                    </span>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3, delay: 0.16 }}
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-5 flex items-center space-x-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#CCDCEF]/60 border border-[#CCDCEF] text-[#213145] flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#667085] font-bold">Total Kecamatan</h4>
                    <span className="text-2xl font-bold font-display text-[#213145]">
                      {byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').length} <span className="text-xs font-semibold text-[#667085]">Kecamatan</span>
                    </span>
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.3, delay: 0.24 }}
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-5 flex items-center space-x-4"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#FF8574]/20 border border-[#FF8574]/40 text-[#222526] flex items-center justify-center">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#667085] font-bold">Total Kelurahan</h4>
                    <span className="text-2xl font-bold font-display text-[#213145]">
                      {byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').length} <span className="text-xs font-semibold text-[#667085]">Kelurahan</span>
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
                  className="lg:col-span-2 bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-4"
                >
                  <div className="border-b border-[#E5EEFF] pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#213145] font-display">Grafik Pasien & Kunjungan Berdasarkan Kota/Kabupaten</h2>
                      <p className="text-xs text-[#667085]">Membandingkan jumlah pasien terdaftar (Bar) dengan total kunjungan (Line).</p>
                    </div>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byKota.filter(c => c.kota !== 'Tidak Diketahui')}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EEFF" />
                        <XAxis dataKey="kota" stroke="#667085" fontSize={12} tickLine={false} />
                        <YAxis stroke="#667085" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#213145" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="jumlah_kunjungan" name="Total Kunjungan" fill="#7CA3CC" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Table Data list */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-4"
                >
                  <div className="border-b border-[#E5EEFF] pb-3">
                    <h3 className="text-sm font-bold text-[#213145] font-display">Data Populasi Wilayah (Kota)</h3>
                    <p className="text-xs text-[#667085]">Detail rincian pasien per domisili kabupaten/kota.</p>
                  </div>
                  <div className="overflow-y-auto max-h-72">
                    <table className="si-table w-full text-left">
                      <thead>
                        <tr>
                          <th className="py-2">Kabupaten / Kota</th>
                          <th className="py-2 text-right">Pasien</th>
                          <th className="py-2 text-right">Kunjungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EEFF]">
                        {byKota.map((item, index) => (
                          <tr key={index} className={`hover:bg-[#F8F9FF] ${item.kota !== 'Tidak Diketahui' ? 'cursor-pointer' : ''}`} onClick={() => item.kota && handleGroupClick('kota', item.kota)}>
                            <td className="py-2 font-medium text-[#213145] hover:text-[#FF8574] transition-colors">{item.kota}</td>
                            <td className="py-2 text-right text-[#222526] font-bold">{item.jumlah_pasien}</td>
                            <td className="py-2 text-right text-[#222526] font-bold">{item.jumlah_kunjungan}</td>
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
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-4"
                >
                  <div className="border-b border-[#E5EEFF] pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#213145] font-display">Sebaran Pasien di Tingkat Kecamatan</h3>
                      <p className="text-xs text-[#667085]">Kecamatan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EEFF" />
                        <XAxis type="number" stroke="#667085" fontSize={12} tickLine={false} />
                        <YAxis type="category" dataKey="kecamatan" stroke="#667085" fontSize={12} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#213145" radius={[0, 4, 4, 0]} barSize={16} onClick={(data: any) => data?.kecamatan && handleGroupClick('kecamatan', data.kecamatan)} cursor="pointer" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.56 }}
                  className="bg-white rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] p-6 space-y-4"
                >
                  <div className="border-b border-[#E5EEFF] pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[#213145] font-display">Sebaran Pasien di Tingkat Kelurahan</h3>
                      <p className="text-xs text-[#667085]">Kelurahan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5EEFF" />
                        <XAxis type="number" stroke="#667085" fontSize={12} tickLine={false} />
                        <YAxis type="category" dataKey="kelurahan" stroke="#667085" fontSize={12} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#7CA3CC" radius={[0, 4, 4, 0]} barSize={16} onClick={(data: any) => data?.kelurahan && handleGroupClick('kelurahan', data.kelurahan)} cursor="pointer" />
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
                  className="bg-white p-6 rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] space-y-4 flex flex-col justify-between"
                >
                  <div className="border-b border-[#E5EEFF] pb-3">
                    <h3 className="text-sm font-bold text-[#213145] font-display">Proporsi Gender Pasien</h3>
                    <p className="text-xs text-[#667085]">Pembagian jumlah pasien terdaftar berdasarkan jenis kelamin.</p>
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
                  <div className="grid grid-cols-2 gap-4 border-t border-[#E5EEFF] pt-4">
                    {byGender.map((item, index) => (
                      <div key={index} className="text-center">
                        <span className="text-xs text-[#667085] font-bold block">{item.jenis_kelamin}</span>
                        <span className="text-base font-extrabold text-[#213145]">
                          {item.jumlah} <span className="text-xs text-[#667085] font-normal">({totalPatients > 0 ? ((item.jumlah / totalPatients) * 100).toFixed(1) : 0}%)</span>
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
                  className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E5EEFF] shadow-[0_2px_8px_rgba(11,28,48,0.06)] space-y-4"
                >
                  <div className="border-b border-[#E5EEFF] pb-3">
                    <h3 className="text-sm font-bold text-[#213145] font-display">Distribusi Berdasarkan Kelompok Usia</h3>
                    <p className="text-xs text-[#667085]">Pengelompokan usia klinis pasien terdaftar di database.</p>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byAgeGroup}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5EEFF" />
                        <XAxis dataKey="kelompok_usia" stroke="#667085" fontSize={12} tickLine={false} />
                        <YAxis stroke="#667085" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="jumlah" name="Jumlah Pasien" fill="#213145" radius={[4, 4, 0, 0]} barSize={34} onClick={(data: any) => data?.kelompok_usia && handleGroupClick('usia', data.kelompok_usia)} cursor="pointer">
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
                className="bg-[#213145] text-white rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_8px_24px_rgba(11,28,48,0.12)]"
              >
                <div className="space-y-1 relative z-10">
                  <h3 className="text-sm font-bold text-[#CCDCEF] flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-[#FF8574] animate-pulse" />
                    Insight Demografi Pasien
                  </h3>
                  <p className="text-xs text-white/80 max-w-xl leading-relaxed">
                    Berdasarkan visualisasi sebaran pasien, kelompok umur <span className="text-[#CCDCEF] font-semibold">{[...byAgeGroup].sort((a,b) => b.jumlah - a.jumlah)[0]?.kelompok_usia || 'Tidak Diketahui'}</span> merupakan populasi pasien tertinggi di Klinik Puri Medika. Dominasi gender adalah <span className="text-[#CCDCEF] font-semibold">{[...byGender].sort((a,b) => b.jumlah - a.jumlah)[0]?.jenis_kelamin || 'Tidak Diketahui'}</span>.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-5 py-3 relative z-10 text-center flex-shrink-0 min-w-[160px] shadow-xs">
                  <span className="text-xs text-[#CCDCEF] block uppercase font-bold tracking-wider">Total Pasien Terdaftar</span>
                  <span className="text-2xl font-black text-white">{totalPatients} <span className="text-xs font-normal text-[#CCDCEF]">Jiwa</span></span>
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
                className="fixed inset-0 bg-[#0B1C30]/42 backdrop-blur-xs"
                onClick={() => setSelectedGroup(null)}
              />
              <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_24px_64px_rgba(11,28,48,0.20)] border border-[#E5EEFF] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-6 py-5 border-b border-[#E5EEFF] flex items-center justify-between bg-[#F8F9FF]">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#CCDCEF]/60 text-[#213145] rounded-xl border border-[#CCDCEF]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-[#213145]">
                      Data Pasien
                    </h3>
                    <p className="text-xs font-medium text-[#667085] uppercase tracking-wider mt-0.5">
                      {selectedGroup.type === 'kota' ? 'Kota/Kabupaten' : selectedGroup.type === 'kecamatan' ? 'Kecamatan' : selectedGroup.type === 'kelurahan' ? 'Kelurahan' : selectedGroup.type === 'gender' ? 'Jenis Kelamin' : 'Kelompok Usia'}: {selectedGroup.name}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="p-2 text-[#667085] hover:bg-[#E5EEFF] hover:text-[#213145] rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {groupLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#213145] mb-4"></div>
                    <p className="text-xs text-[#667085]">Memuat data pasien...</p>
                  </div>
                ) : groupPatients.length === 0 ? (
                  <div className="text-center py-12 bg-[#F8F9FF] rounded-2xl border border-[#E5EEFF] border-dashed">
                    <Users className="h-10 w-10 text-[#667085] mx-auto mb-3" />
                    <p className="text-[#667085] font-medium text-xs">Tidak ada pasien ditemukan di kelompok ini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E5EEFF]">
                    <table className="si-table w-full text-left">
                      <thead>
                        <tr>
                          <th className="py-2.5 px-4">No. RM</th>
                          <th className="py-2.5 px-4">Nama Pasien</th>
                          <th className="py-2.5 px-4">L/P</th>
                          <th className="py-2.5 px-4">Usia</th>
                          <th className="py-2.5 px-4">Alamat Lengkap</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5EEFF]">
                        {groupPatients.map((p, idx) => (
                          <tr key={idx} className="hover:bg-[#F8F9FF] transition-colors">
                            <td className="py-3 px-4 text-[#667085] font-mono text-xs">{p.no_rm}</td>
                            <td className="py-3 px-4 font-bold text-[#213145]">{p.nama}</td>
                            <td className="py-3 px-4 text-[#222526]">{p.jenis_kelamin}</td>
                            <td className="py-3 px-4 text-[#667085] text-xs">
                              {p.tanggal_lahir ? Math.floor((new Date().getTime() - new Date(p.tanggal_lahir).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) + ' thn' : '-'}
                            </td>
                            <td className="py-3 px-4 text-[#667085] text-xs truncate max-w-[200px]" title={p.alamat || '-'}>{p.alamat || '-'}</td>
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
              className="fixed inset-0 bg-[#0B1C30]/42 backdrop-blur-xs z-[9999] pointer-events-auto"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-[#222526] shadow-2xl z-[10000] border-l border-[#E5EEFF] flex flex-col pointer-events-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#E5EEFF] bg-[#F8F9FF] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-[#CCDCEF]/60 border border-[#CCDCEF] flex items-center justify-center font-bold text-[#213145]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#213145] font-display uppercase tracking-wider">Profil & Riwayat Pasien</h3>
                    <span className="text-xs text-[#213145] font-mono font-medium">No. RM: {selectedPatient.no_rm}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 rounded-lg bg-white border border-[#CCDCEF] text-[#667085] hover:text-[#213145] hover:bg-[#F8F9FF] cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Patient Basic Profile details */}
              <div className="p-6 bg-[#F8F9FF]/50 border-b border-[#E5EEFF] space-y-4">
                <h4 className="text-xs uppercase tracking-wider text-[#213145] font-bold">Informasi Demografis</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-medium text-[#667085]">
                  <div>
                    <span className="text-[#667085] block">Nama Pasien</span>
                    <span className="text-[#213145] text-xs font-semibold">{selectedPatient.nama}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Jenis Kelamin</span>
                    <span className="text-[#213145] text-xs font-semibold">{selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : selectedPatient.jenis_kelamin === 'P' ? 'Perempuan' : selectedPatient.jenis_kelamin}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Kelompok Usia (Lahir)</span>
                    <span className="text-[#213145] text-xs font-semibold">{calculateAge(selectedPatient.tanggal_lahir)}</span>
                  </div>
                  <div>
                    <span className="text-[#667085] block">Wilayah Domisili</span>
                    <span className="text-[#213145] text-xs font-semibold">{selectedPatient.kota}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#667085] block">Alamat Lengkap</span>
                    <span className="text-[#213145] text-xs font-semibold">{selectedPatient.alamat}</span>
                  </div>
                </div>
              </div>

              {/* History Timeline of Visits */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-[#213145] font-bold">Daftar Kunjungan All-Time</h4>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#CCDCEF]/50 text-[#213145] border border-[#CCDCEF]">
                    {selectedPatient.total_visits} Kali
                  </span>
                </div>
                {patientHistory.some(h => h.tagihan != null) && (
                  <div className="flex items-center justify-between text-xs font-semibold bg-[#CCDCEF]/30 border border-[#CCDCEF] rounded-xl px-4 py-2.5">
                    <span className="text-[#213145] flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Total Tagihan</span>
                    <span className="text-[#213145] font-mono font-bold">{formatRupiah(patientHistory.reduce((a, h) => a + Number(h.tagihan || 0), 0))}</span>
                  </div>
                )}

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#213145]"></div>
                    <span className="text-xs text-[#667085] mt-2">Memuat riwayat...</span>
                  </div>
                ) : patientHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#667085] font-medium">Belum ada catatan riwayat kunjungan pelayanan.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EEFF]">
                    {patientHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-7 group">
                        {/* Timeline node */}
                        <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-white border-2 border-[#213145] group-hover:bg-[#213145] transition-colors" />
                        
                        <div className="bg-[#F8F9FF] hover:bg-white hover:shadow-sm transition-all p-4 rounded-xl border border-[#E5EEFF] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-[#667085] flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#667085]" />
                              {formatTanggalIndo(item.tanggal_pelayanan)}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              item.tipe === 'Rawat Jalan' ? 'bg-[#CCDCEF]/40 text-[#213145] border-[#CCDCEF]' :
                              item.tipe === 'IGD' ? 'bg-[#FF8574]/20 text-[#222526] border-[#FF8574]/40' :
                              'bg-[#213145] text-white border-[#213145]'
                            }`}>
                              {item.tipe}
                            </span>
                          </div>

                          <div className="text-xs font-medium">
                            <span className="text-[#667085] block">DPJP / Dokter Pelaksana</span>
                            <span className="text-[#213145] font-semibold">{item.dpjp}</span>
                          </div>

                          <div className="text-xs font-medium bg-white p-2.5 rounded-lg border border-[#E5EEFF]">
                            <span className="text-[#667085] block">Diagnosa ICD-10</span>
                            <span className="text-[#213145] font-mono font-medium">{item.icd}</span>
                          </div>

                          {item.tagihan != null && (
                            <div className="text-xs font-medium bg-white p-2.5 rounded-lg border border-[#CCDCEF]">
                              <div className="flex items-center justify-between">
                                <span className="text-[#667085]">Tagihan</span>
                                <span className="text-[#213145] font-bold font-mono">{formatRupiah(item.tagihan)}</span>
                              </div>
                              <details className="mt-1">
                                <summary className="cursor-pointer text-[#667085]">Rincian</summary>
                                <div className="mt-1 space-y-0.5 text-[#222526]">
                                  {([['tarif_pendaftaran', 'Pendaftaran'], ['kartu_pasien', 'Kartu Pasien'], ['konsultasi', 'Konsultasi'], ['tindakan', 'Tindakan'], ['penunjang', 'Penunjang'], ['farmasi', 'Farmasi'], ['bhp', 'BHP'], ['lain_lain', 'Lain-lain'], ['potongan', 'Potongan']] as const)
                                    .filter(([k]) => Number(item[k]) > 0)
                                    .map(([k, label]) => (
                                      <div key={k} className="flex justify-between">
                                        <span>{label}</span>
                                        <span>{k === 'potongan' ? '- ' : ''}{formatRupiah(item[k])}</span>
                                      </div>
                                    ))}
                                </div>
                              </details>
                            </div>
                          )}
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

      {/* Import Tagihan Modal */}
      {createPortal(
      <AnimatePresence>
        {showImportTagihan && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={closeImportTagihan}
              className="fixed inset-0 bg-[#0B1C30]/42 backdrop-blur-xs z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(11,28,48,0.20)] border border-[#E5EEFF] w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto">
                <div className="flex items-center justify-between p-5 border-b border-[#E5EEFF] bg-[#F8F9FF]/60 rounded-t-2xl">
                  <div>
                    <h3 className="text-sm font-bold text-[#213145]">Import Tagihan per Registrasi</h3>
                    <p className="text-xs text-[#667085]">Tempel data (tab-separated) dari sistem billing. Registrasi yang sama akan ditimpa.</p>
                  </div>
                  <button onClick={closeImportTagihan} className="p-1.5 rounded-lg hover:bg-white text-[#667085] hover:text-[#213145] border border-transparent hover:border-[#CCDCEF] cursor-pointer"><X className="h-4 w-4" /></button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto">
                  {tagihanPreview === null ? (
                    <textarea
                      value={tagihanText}
                      onChange={(e) => setTagihanText(e.target.value)}
                      placeholder="Tempel data di sini, termasuk baris header (NO, NO REGISTRASI, PASIEN, ...)"
                      className="w-full h-64 p-3 text-xs font-mono rounded-xl border border-[#CCDCEF] focus:border-[#213145] focus:ring-2 focus:ring-[#CCDCEF]/50 outline-none text-[#222526] bg-white"
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2.5 text-xs font-semibold">
                        <span className="px-2.5 py-1 rounded-lg bg-[#CCDCEF]/60 text-[#213145] border border-[#CCDCEF]">{tagihanPreview.filter(r => !r.error).length} baris valid</span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#FF8574] text-[#222526] font-semibold">{tagihanPreview.filter(r => r.error).length} baris error (dilewati)</span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#213145] text-white">
                          Total {formatRupiah(tagihanPreview.filter(r => !r.error).reduce((a, r) => a + r.tagihan, 0))}
                        </span>
                      </div>
                      <div className="overflow-x-auto border border-[#E5EEFF] rounded-xl">
                        <table className="si-table w-full text-xs">
                          <thead>
                            <tr>
                              <th className="p-2.5">No. Registrasi</th>
                              <th className="p-2.5">Pasien</th>
                              <th className="p-2.5">Unit</th>
                              <th className="p-2.5 text-right">Tagihan</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5EEFF]">
                            {tagihanPreview.map((r, i) => (
                              <tr key={i} className={`hover:bg-[#F8F9FF] ${r.error ? 'bg-[#FF8574]/15' : ''}`}>
                                <td className="p-2.5 font-mono text-[#667085]">{r.no_registrasi || '-'}</td>
                                <td className="p-2.5 font-medium text-[#213145]">{r.nama_pasien}</td>
                                <td className="p-2.5 text-[#667085]">{r.unit}</td>
                                <td className="p-2.5 text-right font-semibold font-mono text-[#213145]">{r.error ? '-' : formatRupiah(r.tagihan)}</td>
                                <td className={`p-2.5 font-semibold ${r.error ? 'text-[#D94E3B]' : 'text-[#213145]'}`}>{r.error || 'OK'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 p-5 border-t border-[#E5EEFF] bg-[#F8F9FF]/40 rounded-b-2xl">
                  {tagihanPreview === null ? (
                    <button
                      disabled={!tagihanText.trim()}
                      onClick={() => setTagihanPreview(parseTagihanText(tagihanText))}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#213145] text-white hover:bg-[#122030] disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      Preview
                    </button>
                  ) : (
                    <>
                      <button onClick={() => setTagihanPreview(null)} className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#CCDCEF] text-[#222526] hover:bg-[#F8F9FF] cursor-pointer">Kembali</button>
                      <button
                        disabled={tagihanSaving || tagihanPreview.every(r => r.error)}
                        onClick={handleSaveTagihan}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#213145] text-white hover:bg-[#122030] disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {tagihanSaving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </>
                  )}
                </div>
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
              className="fixed inset-0 bg-[#0B1C30]/42 backdrop-blur-xs z-[19999] pointer-events-auto"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto max-w-lg h-fit bg-white rounded-2xl shadow-[0_24px_64px_rgba(11,28,48,0.20)] z-[20000] border border-[#E5EEFF] flex flex-col p-6 space-y-4 pointer-events-auto"
            >
              <div className="flex items-center justify-between border-b border-[#E5EEFF] pb-3">
                <div className="flex items-center space-x-2.5 text-[#213145]">
                  <div className="p-2 bg-[#CCDCEF]/60 text-[#213145] rounded-xl border border-[#CCDCEF]">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-display text-[#213145]">
                      {showWaModal.isBroadcast ? 'Broadcast WhatsApp Pasien Loyal' : 'Kirim WhatsApp Pasien'}
                    </h3>
                    <p className="text-xs text-[#667085]">
                      {showWaModal.isBroadcast 
                        ? `Akan dikirim ke ${selectedRegisteredLoyal.length} pasien secara berurutan.`
                        : `Kirim ke: ${showWaModal.patient?.pasien_nama} (${showWaModal.patient?.no_telp || '-'})`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWaModal({ isOpen: false, patient: null, isBroadcast: false })}
                  className="p-1 rounded-lg hover:bg-[#F8F9FF] text-[#667085] hover:text-[#213145] transition-colors cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-[#667085] font-bold block">Pesan WhatsApp</label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full text-xs p-3 rounded-xl border border-[#CCDCEF] focus:border-[#213145] focus:ring-2 focus:ring-[#CCDCEF]/50 outline-none bg-white text-[#222526] font-medium font-sans"
                  placeholder="Tulis pesan Anda di sini..."
                />
                {showWaModal.isBroadcast && (
                  <p className="text-xs text-[#667085]">
                    <span className="font-semibold text-[#213145]">Info:</span> Gunakan tag <code className="bg-[#CCDCEF]/30 px-1 py-0.5 rounded font-mono text-[#213145] border border-[#CCDCEF]">[Nama]</code> untuk menyisipkan nama masing-masing pasien secara dinamis saat broadcast.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWaModal({ isOpen: false, patient: null, isBroadcast: false })}
                  className="px-4 py-2 text-xs font-semibold text-[#222526] bg-white border border-[#CCDCEF] hover:bg-[#F8F9FF] rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={waSending}
                  onClick={handleSendWa}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#213145] hover:bg-[#122030] disabled:bg-[#CCDCEF] disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
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
              className="fixed inset-0 bg-[#0B1C30]/42 backdrop-blur-xs z-[19999] pointer-events-auto"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-[#222526] shadow-2xl z-[20000] border-l border-[#E5EEFF] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#E5EEFF] bg-[#F8F9FF] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-[#CCDCEF]/60 border border-[#CCDCEF] flex items-center justify-center font-bold text-[#213145]">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#213145] font-display uppercase tracking-wider">Riwayat WhatsApp Pasien</h3>
                    <span className="text-xs text-[#213145] font-mono font-medium">Pasien: {showHistoryModal.patient?.pasien_nama || showHistoryModal.patient?.nama}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistoryModal({ isOpen: false, patient: null })}
                  className="p-1.5 rounded-lg bg-white border border-[#CCDCEF] text-[#667085] hover:text-[#213145] hover:bg-[#F8F9FF] cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Logs Content List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                {waHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#213145]"></div>
                    <span className="text-xs text-[#667085] mt-2 block">Memuat riwayat pesan...</span>
                  </div>
                ) : waHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#667085] font-medium">Belum ada riwayat pesan WhatsApp yang terekam untuk pasien ini.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5EEFF]">
                    {waHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-7 group">
                        {/* Timeline node */}
                        <div className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-white border-2 ${item.status === 'success' ? 'border-[#213145]' : 'border-[#FF8574]'}`} />
                        
                        <div className="bg-[#F8F9FF] hover:bg-white hover:shadow-xs transition-all p-4 rounded-xl border border-[#E5EEFF] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-[#667085] flex items-center gap-1">
                              <Clock className="h-3 w-3 text-[#667085]" />
                              {new Date(item.sent_at).toLocaleString('id-ID')}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                              item.status === 'success' 
                                ? 'bg-[#CCDCEF]/60 text-[#213145] border-[#CCDCEF]' 
                                : 'bg-[#FF8574] text-[#222526] border-[#FF8574]'
                            }`}>
                              {item.status === 'success' ? 'Terkirim' : 'Gagal'}
                            </span>
                          </div>

                          <div className="text-xs font-medium text-[#222526] whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#E5EEFF]">
                            {item.message}
                          </div>

                          <div className="text-xs text-[#667085] font-medium text-right">
                            Dikirim oleh: <span className="font-semibold text-[#213145]">{item.sender_username || 'System'}</span>
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
});
