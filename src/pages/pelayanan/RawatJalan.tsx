import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ClipboardList, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  X, 
  FileCheck, 
  ArrowRight, 
  Upload, 
  Layers,
  Heart
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api.js';

interface Tindakan {
  id?: number;
  pelaksana: string;
  tindakan_nama: string;
  tindakan_keterangan: string;
  tindakan_tanggal: string;
  tindakan_jam: string;
  tarif_tindakan: number;
  tarif_sarana: number;
  tarif_pelayanan: number;
  tarif_medis: number;
  jumlah: number;
  subtotal: number;
}

interface OutpatientRecord {
  id: number;
  no_registrasi: string;
  no_rm: string;
  nama_pasien: string;
  tanggal_pelayanan: string;
  tindakan: Tindakan[];
  created_at?: string;
  triase?: string;
}

const COLORS = ['#0d9488', '#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#10b981'];

const getTriageStyle = (triase?: string) => {
  const normalized = String(triase || 'hijau').toLowerCase();
  switch (normalized) {
    case 'merah':
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
        dotBg: 'bg-rose-500',
        text: 'Merah / Gawat Darurat'
      };
    case 'kuning':
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
        dotBg: 'bg-amber-500',
        text: 'Kuning / Darurat'
      };
    case 'hitam':
      return {
        bg: 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200',
        dotBg: 'bg-slate-900',
        text: 'Hitam / Meninggal'
      };
    case 'hijau':
    default:
      return {
        bg: 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100',
        dotBg: 'bg-emerald-500',
        text: 'Hijau / Non-Darurat'
      };
  }
};

export default function RawatJalan() {
  const [records, setRecords] = useState<OutpatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [triageFilter, setTriageFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'statistik' | 'kunjungan' | 'input'>('statistik');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Input States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  
  // Form states for manual registration
  const [noRegistrasi, setNoRegistrasi] = useState('');
  const [noRm, setNoRm] = useState('');
  const [namaPasien, setNamaPasien] = useState('');
  const [tanggalPelayanan, setTanggalPelayanan] = useState(new Date().toISOString().split('T')[0]);
  const [triase, setTriase] = useState('hijau');
  const [manualTindakan, setManualTindakan] = useState<Tindakan[]>([
    {
      pelaksana: '',
      tindakan_nama: '',
      tindakan_keterangan: '',
      tindakan_tanggal: new Date().toISOString().split('T')[0],
      tindakan_jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
      tarif_tindakan: 0,
      tarif_sarana: 0,
      tarif_pelayanan: 0,
      tarif_medis: 0,
      jumlah: 1,
      subtotal: 0
    }
  ]);

  // Bulk importer states
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Load records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pelayanan/rawat-jalan');
      setRecords(res.data || []);
    } catch (err: any) {
      console.error('Gagal memuat rekap pelayanan', err);
      showFeedback('error', 'Gagal memuat database pelayanan rawat jalan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Helper calculation for manual tindakan subtotal
  const updateTarifFields = (index: number, field: string, val: number) => {
    const updated = [...manualTindakan];
    const t = updated[index];
    if (field === 'tarif_tindakan') t.tarif_tindakan = val;
    if (field === 'tarif_sarana') t.tarif_sarana = val;
    if (field === 'tarif_pelayanan') t.tarif_pelayanan = val;
    if (field === 'tarif_medis') t.tarif_medis = val;
    if (field === 'jumlah') t.jumlah = val;

    // Standard business logic subtotal addition
    t.subtotal = (t.tarif_tindakan + t.tarif_sarana + t.tarif_pelayanan + t.tarif_medis) * t.jumlah;
    setManualTindakan(updated);
  };

  const addManualTindakanRow = () => {
    setManualTindakan([
      ...manualTindakan,
      {
        pelaksana: '',
        tindakan_nama: '',
        tindakan_keterangan: '',
        tindakan_tanggal: tanggalPelayanan,
        tindakan_jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        tarif_tindakan: 0,
        tarif_sarana: 0,
        tarif_pelayanan: 0,
        tarif_medis: 0,
        jumlah: 1,
        subtotal: 0
      }
    ]);
  };

  const removeManualTindakanRow = (index: number) => {
    if (manualTindakan.length <= 1) return;
    setManualTindakan(manualTindakan.filter((_, idx) => idx !== index));
  };

  // Manual CRUD Save
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noRegistrasi || !noRm || !namaPasien || !tanggalPelayanan) {
      showFeedback('error', 'Mohon isi semua data demografi pasien.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && editTargetId) {
        await api.put(`/pelayanan/rawat-jalan/${editTargetId}`, {
          no_rm: noRm,
          nama_pasien: namaPasien,
          tanggal_pelayanan: tanggalPelayanan,
          triase: triase,
          tindakan: manualTindakan
        });
        showFeedback('success', `Data pendaftaran ${noRegistrasi} berhasil diperbarui.`);
      } else {
        await api.post('/pelayanan/rawat-jalan', {
          no_registrasi: noRegistrasi,
          no_rm: noRm,
          nama_pasien: namaPasien,
          tanggal_pelayanan: tanggalPelayanan,
          triase: triase,
          tindakan: manualTindakan
        });
        showFeedback('success', 'Data pendaftaran rawat jalan berhasil diregistrasi.');
      }
      
      resetManualForm();
      fetchRecords();
      setActiveTab('kunjungan');
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.response?.data?.message || 'Gagal menyimpan pelayanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setNoRegistrasi('');
    setNoRm('');
    setNamaPasien('');
    setTanggalPelayanan(new Date().toISOString().split('T')[0]);
    setTriase('hijau');
    setManualTindakan([
      {
        pelaksana: '',
        tindakan_nama: '',
        tindakan_keterangan: '',
        tindakan_tanggal: new Date().toISOString().split('T')[0],
        tindakan_jam: new Date().toLocaleTimeString('id-ID', { hour12: false }),
        tarif_tindakan: 0,
        tarif_sarana: 0,
        tarif_pelayanan: 0,
        tarif_medis: 0,
        jumlah: 1,
        subtotal: 0
      }
    ]);
    setIsEditMode(false);
    setEditTargetId(null);
    setIsManualModalOpen(false);
  };

  const handleEditClick = (rec: OutpatientRecord) => {
    setNoRegistrasi(rec.no_registrasi);
    setNoRm(rec.no_rm);
    setNamaPasien(rec.nama_pasien);
    setTanggalPelayanan(rec.tanggal_pelayanan);
    setTriase(rec.triase || 'hijau');
    
    // map tindakan
    setManualTindakan(rec.tindakan.map(t => ({
      pelaksana: t.pelaksana,
      tindakan_nama: t.tindakan_nama,
      tindakan_keterangan: t.tindakan_keterangan || '',
      tindakan_tanggal: t.tindakan_tanggal,
      tindakan_jam: t.tindakan_jam,
      tarif_tindakan: Number(t.tarif_tindakan || 0),
      tarif_sarana: Number(t.tarif_sarana || 0),
      tarif_pelayanan: Number(t.tarif_pelayanan || 0),
      tarif_medis: Number(t.tarif_medis || 0),
      jumlah: Number(t.jumlah || 1),
      subtotal: Number(t.subtotal || 0)
    })));

    setIsEditMode(true);
    setEditTargetId(rec.id);
    setIsManualModalOpen(true);
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kunjungan pasien rawat jalan ini secara permanen?')) return;
    try {
      await api.delete(`/pelayanan/rawat-jalan/${id}`);
      showFeedback('success', 'Data kunjungan berhasil dihapus.');
      fetchRecords();
    } catch (err) {
      showFeedback('error', 'Gagal menghapus data kunjungan.');
    }
  };

  // Paste Text Parser Suite
  const triggerParser = () => {
    if (!rawText.trim()) {
      showFeedback('error', 'Teks kosong. Tempelkan data berpola tabel terlebih dahulu.');
      return;
    }

    const lines = rawText.split('\n');
    const tempActions: any[] = [];
    
    let headerSkipped = false;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Attempt splitting by tabs
      let cols = line.split('\t').map(c => c.trim());
      
      // If single column lookups, try multiple spaces
      if (cols.length < 5) {
        cols = line.split(/\s{2,}/).map(c => c.trim());
      }

      // Check header matches
      if (cols[0] === 'NO' || cols[1]?.toLowerCase().includes('registrasi') || cols[1] === 'NO. REGISTRASI') {
        headerSkipped = true;
        continue;
      }

      if (cols.length < 6) {
        continue; // incomplete line schema
      }

      // Populate elements
      const idNo = cols[0];
      const noReg = cols[1];
      const noRmCode = cols[2];
      const pName = cols[3];
      const exec = cols[4];
      const tName = cols[5];
      const tKet = cols[6] || '';
      const tTgl = cols[7] || '';
      const tJam = cols[8] || '08:00:00';

      // Cleaner
      const cleanNum = (str: string) => {
        if (!str) return 0;
        // Strip everything but digits
        const stripped = str.replace(/[^\d]/g, '');
        return Number(stripped) || 0;
      };

      const tTarif = cleanNum(cols[9]);
      const tSarana = cleanNum(cols[10]);
      const tPel = cleanNum(cols[11]);
      const tMedis = cleanNum(cols[12]);
      const qty = cleanNum(cols[13]) || 1;
      const sub = cleanNum(cols[14]) || (tTarif * qty);

      // Date parsed DD-MM-YYYY to YYYY-MM-DD
      let formattedDate = tTgl;
      if (tTgl.includes('-') || tTgl.includes('/')) {
        const parts = tTgl.split(/[-/]/);
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          formattedDate = `${y}-${m}-${d}`;
        }
      } else {
        // Fallback default date
        formattedDate = new Date().toISOString().split('T')[0];
      }

      if (noReg && pName && tName) {
        tempActions.push({
          no_registrasi: noReg,
          no_rm: noRmCode,
          nama_pasien: pName,
          tanggal_pelayanan: formattedDate,
          pelaksana: exec,
          tindakan_nama: tName,
          tindakan_keterangan: tKet,
          tindakan_tanggal: formattedDate,
          tindakan_jam: tJam,
          tarif_tindakan: tTarif,
          tarif_sarana: tSarana,
          tarif_pelayanan: tPel,
          tarif_medis: tMedis,
          jumlah: qty,
          subtotal: sub
        });
      }
    }

    // Now Group on NO_REGISTRASI
    const groupedMap: { [key: string]: any } = {};
    for (const act of tempActions) {
      const key = act.no_registrasi;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          no_registrasi: act.no_registrasi,
          no_rm: act.no_rm,
          nama_pasien: act.nama_pasien,
          tanggal_pelayanan: act.tanggal_pelayanan,
          tindakan: []
        };
      }
      groupedMap[key].tindakan.push({
        pelaksana: act.pelaksana,
        tindakan_nama: act.tindakan_nama,
        tindakan_keterangan: act.tindakan_keterangan,
        tindakan_tanggal: act.tindakan_tanggal,
        tindakan_jam: act.tindakan_jam,
        tarif_tindakan: act.tarif_tindakan,
        tarif_sarana: act.tarif_sarana,
        tarif_pelayanan: act.tarif_pelayanan,
        tarif_medis: act.tarif_medis,
        jumlah: act.jumlah,
        subtotal: act.subtotal
      });
    }

    const output = Object.values(groupedMap);
    if (output.length === 0) {
      showFeedback('error', 'Format tidak sesuai. Cek kembali tabulasi baris teks.');
      return;
    }

    setParsedData(output);
    setIsParsed(true);
    showFeedback('success', `Berhasil mengurai ${output.length} registrasi kunjungan unik.`);
  };

  const handleBulkInsert = async () => {
    if (parsedData.length === 0) return;
    setSubmitting(true);
    let successCount = 0;

    try {
      for (const p of parsedData) {
        await api.post('/pelayanan/rawat-jalan', {
          no_registrasi: p.no_registrasi,
          no_rm: p.no_rm,
          nama_pasien: p.nama_pasien,
          tanggal_pelayanan: p.tanggal_pelayanan,
          tindakan: p.tindakan
        });
        successCount++;
      }
      showFeedback('success', `Masif sukses: Berhasil memasukkan ${successCount} data registrasi pasien.`);
      setParsedData([]);
      setIsParsed(false);
      setRawText('');
      fetchRecords();
      setActiveTab('records');
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal menyimpan massal: Terakhir tersimpan ${successCount}. Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset currentPage to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, triageFilter]);

  // Filtered lists for rendering search query and triage
  const filteredRecords = (Array.isArray(records) ? records : []).filter(rec => {
    const q = searchQuery.toLowerCase();
    const matchesTriage = triageFilter === 'all' || String(rec.triase || 'hijau').toLowerCase() === triageFilter;
    const matchesSearch = (
      rec.nama_pasien.toLowerCase().includes(q) ||
      rec.no_registrasi.toLowerCase().includes(q) ||
      rec.no_rm.toLowerCase().includes(q) ||
      rec.tindakan.some(t => t.tindakan_nama.toLowerCase().includes(q) || t.pelaksana.toLowerCase().includes(q))
    );
    return matchesTriage && matchesSearch;
  });

  // Calculate high-quality triage statistics for infographic
  const triageStats = useMemo(() => {
    let hijau = 0;
    let kuning = 0;
    let merah = 0;
    let hitam = 0;
    
    (Array.isArray(records) ? records : []).forEach(r => {
      const t = String(r.triase || 'hijau').toLowerCase();
      if (t === 'hijau') hijau++;
      else if (t === 'kuning') kuning++;
      else if (t === 'merah') merah++;
      else if (t === 'hitam') hitam++;
    });
    
    return [
      { name: 'Hijau', count: hijau, key: 'hijau', color: '#10b981', hoverColor: '#059669', desc: 'Non-Darurat' },
      { name: 'Kuning', count: kuning, key: 'kuning', color: '#f59e0b', hoverColor: '#d97706', desc: 'Darurat' },
      { name: 'Merah', count: merah, key: 'merah', color: '#ef4444', hoverColor: '#dc2626', desc: 'Gawat Darurat' },
      { name: 'Hitam', count: hitam, key: 'hitam', color: '#1e293b', hoverColor: '#0f172a', desc: 'Meninggal' }
    ];
  }, [records]);

  const itemsPerPage = 100;
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Calculate high-quality analytics summaries
  const safeRecords = Array.isArray(records) ? records : [];
  const totalVisits = safeRecords.length;
  const totalIncome = safeRecords.reduce((sum, r) => sum + r.tindakan.reduce((sub, t) => sub + t.subtotal, 0), 0);
  const totalProcedures = safeRecords.reduce((sum, r) => sum + r.tindakan.length, 0);

  // Group procedure counts
  const procedureMap: { [key: string]: number } = {};
  const pelaksanaMap: { [key: string]: number } = {};
  const dateMap: { [key: string]: { kunjungan: number; pendapatan: number } } = {};

  safeRecords.forEach(r => {
    const dStr = r.tanggal_pelayanan;
    if (!dateMap[dStr]) dateMap[dStr] = { kunjungan: 0, pendapatan: 0 };
    dateMap[dStr].kunjungan += 1;

    r.tindakan.forEach(t => {
      procedureMap[t.tindakan_nama] = (procedureMap[t.tindakan_nama] || 0) + 1;
      pelaksanaMap[t.pelaksana] = (pelaksanaMap[t.pelaksana] || 0) + 1;
      dateMap[dStr].pendapatan += t.subtotal;
    });
  });

  // Most Active Clinic Performer
  let topPerformer = '-';
  let topPerformerCount = 0;
  Object.entries(pelaksanaMap).forEach(([name, count]) => {
    if (count > topPerformerCount) {
      topPerformer = name;
      topPerformerCount = count;
    }
  });

  // Top 5 treatments
  const chartTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Daily Trend Charts Data
  const chartTrendData = Object.entries(dateMap)
    .map(([tanggal, data]) => ({
      tanggal: new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      kunjungan: data.kunjungan,
      pendapatan: data.pendapatan / 1000 // in thousands Rp for better readability
    }))
    .sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-teal-600" />
            <span>Rawat Jalan (Outpatient Services)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Pencatatan log kunjungan medis, rincian tindakan, pengisian triase, dan rekapitulasi pelayanan rawat jalan.
          </p>
        </div>

        {/* Custom Tab selectors & Manual Input trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl self-start">
            <button
              onClick={() => setActiveTab('statistik')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'statistik' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Statistik
            </button>
            <button
              onClick={() => setActiveTab('kunjungan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'kunjungan' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Daftar Kunjungan
            </button>
            <button
              onClick={() => setActiveTab('input')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'input' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Input Data
            </button>
          </div>
          
          <button
            onClick={() => {
              resetManualForm();
              setIsManualModalOpen(true);
            }}
            id="btn-registrasi-manual"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Registrasi Manual</span>
          </button>
        </div>
      </div>

      {/* Floating feedback portal */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl flex items-center space-x-3 shadow-lg border ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
            <span className="text-xs font-semibold leading-relaxed">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LOADING SPINNERS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-teal-600" />
          <p className="text-slate-400 font-mono text-xs mt-4">Mengakses data server rawat jalan...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD & STATS */}
          {activeTab === 'statistik' && (
            <div className="space-y-6">
              {/* Core metrics bento boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1 */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] font-extrabold tracking-wider uppercase">Kunjungan Pasien</span>
                    <h3 className="text-xl font-semibold text-slate-800 font-display tracking-tight mt-1">
                      {totalVisits} <span className="text-xs font-normal text-slate-400">Kasus</span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 bg-slate-900/5 text-slate-700 rounded-2xl flex items-center justify-center shadow-xs">
                    <Users className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* 2 */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] font-extrabold tracking-wider uppercase">Tindakan Medis</span>
                    <h3 className="text-xl font-semibold text-slate-800 font-display tracking-tight mt-1">
                      {totalProcedures} <span className="text-xs font-normal text-slate-400">Kali</span>
                    </h3>
                  </div>
                  <div className="h-12 w-12 bg-slate-900/5 text-slate-700 rounded-2xl flex items-center justify-center shadow-xs">
                    <ClipboardList className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* 3 */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] font-extrabold tracking-wider uppercase">Pendapatan Pelayanan</span>
                    <h3 className="text-xl font-semibold text-slate-800 font-display tracking-tight mt-1.5">
                      Rp {totalIncome.toLocaleString('id-ID')}
                    </h3>
                  </div>
                  <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shadow-xs">
                    <DollarSign className="h-5.5 w-5.5" />
                  </div>
                </div>

                {/* 4 */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px] font-extrabold tracking-wider uppercase">Pratika Teraktif</span>
                    <h3 className="text-sm font-extrabold text-slate-850 truncate max-w-[12rem] mt-2.5">
                      {topPerformer}
                    </h3>
                    <span className="text-xxs text-slate-400 font-medium">Melayani {topPerformerCount} prosedur</span>
                  </div>
                  <div className="h-12 w-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shadow-xs">
                    <CheckCircle className="h-5.5 w-5.5" />
                  </div>
                </div>
              </div>

              {/* Graphical trends */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Kunjungan & Pendapatan Harian */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">Grafik Tren Kunjungan & Omset Harian</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pendapatan disajikan dalam nominal ribuan rupiah (K)</p>
                  </div>

                  <div className="h-[280px]">
                    {chartTrendData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-slate-350 text-xs font-mono">
                        Tidak ada data statistik tersedia
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="tanggal" fontSize={10} tickLine={false} stroke="#94a3b8" />
                          <YAxis yAxisId="left" fontSize={10} tickLine={false} stroke="#2563eb" label={{ value: 'Kunjungan', angle: -90, position: 'insideLeft', style: {fontSize: 9, fill: '#2563eb'} }} />
                          <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} stroke="#0d9488" label={{ value: 'Pendapatan (K Rp)', angle: 90, position: 'insideRight', style: {fontSize: 9, fill: '#0d9488'} }} />
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar yAxisId="left" dataKey="kunjungan" name="Kunjungan" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line yAxisId="right" type="monotone" dataKey="pendapatan" name="Tarif Pendapatan" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 2: Top 5 Procedures */}
                <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">5 Jenis Tindakan Terbanyak</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Distribusi klasifikasi tindakan rawat jalan</p>
                  </div>

                  <div className="h-[250px] flex items-center justify-center">
                    {chartTreatmentData.length === 0 ? (
                      <div className="text-slate-350 text-xs font-mono">Belum ada tindakan medis tercatat</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartTreatmentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                          >
                            {chartTreatmentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Legends */}
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {chartTreatmentData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-medium text-slate-650">
                        <div className="flex items-center space-x-2 truncate max-w-[12rem]">
                          <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{item.count} tindakan</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Pasted Output references */}
              <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl space-y-3.5 relative overflow-hidden shadow-md">
                <div className="absolute top-[-20%] right-[-10%] w-[20rem] h-[20rem] bg-teal-500/10 rounded-full blur-[80px]" />
                <div className="flex items-center space-x-2.5 z-10 relative">
                  <FileText className="h-5 w-5 text-teal-400" />
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-teal-400">Instruksi Integrasi Impor Cepat (Paste Excel)</h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 max-w-4xl z-10 relative">
                  Fasilitas kami mendukung penginputan rekam medis outpatient secara masif dari spreadsheet Excel maupun kuitansi klaim. Salin penuh seluruh baris data tabular tindakan, masuk ke menu <strong>&ldquo;Import Teks&rdquo;</strong>, tempelkan, dan sistem kami secara dinamis meng-grouping tindakan beruntun di bawah satu kode pendaftaran pasien yang sama secara otomatis!
                </p>
                <div className="pt-1.5 z-10 relative">
                  <button 
                    onClick={() => setActiveTab('import')} 
                    className="inline-flex items-center space-x-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <span>Coba Impor Massal Sekarang</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED RECORDS GRID */}
          {activeTab === 'kunjungan' && (
            <div className="space-y-4">
              {/* Infografis Kunjungan Per Triase */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-50/40 p-4 rounded-3xl border border-slate-150">
                {/* Left side: Grid of Clickable Triage widgets (Col-span 3) */}
                <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {triageStats.map((item) => {
                    const isActive = triageFilter === item.key;
                    const percent = records.length > 0 ? Math.round((item.count / records.length) * 100) : 0;
                    
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setTriageFilter(isActive ? 'all' : item.key);
                          setCurrentPage(1);
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                          isActive 
                            ? 'bg-white border-teal-500 shadow-sm ring-2 ring-teal-500/10' 
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        {/* Status tag/dot */}
                        <div className="flex items-center justify-between">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            {percent}%
                          </span>
                        </div>
                        
                        {/* Value and Label */}
                        <div className="mt-4">
                          <h4 className="text-lg font-semibold text-slate-800 font-mono tracking-tight">
                            {item.count} <span className="text-xs font-normal text-slate-400">Kasus</span>
                          </h4>
                          <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">
                            Triase {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-normal">
                            {item.desc}
                          </p>
                        </div>

                        {/* Interactive footer indicating click-to-filter */}
                        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className={`text-[9px] font-extrabold ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-650'}`}>
                            {isActive ? '✓ Aktif Memfilter' : 'Klik Untuk Filter'}
                          </span>
                          <ArrowRight className={`h-2.5 w-2.5 transition-all ${isActive ? 'text-teal-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right side: Mini pie chart viz of triage distribution (Col-span 1) */}
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl flex flex-col justify-between">
                  <div className="text-left">
                    <span className="text-slate-400 text-[9px] font-extrabold uppercase tracking-widest block">Distribusi Persentase</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">Proporsi Kasus Triase</span>
                  </div>
                  
                  {records.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xxs font-medium">
                      Belum ada data kunjungan
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-24 relative my-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={triageStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={22}
                            outerRadius={34}
                            paddingAngle={3}
                            dataKey="count"
                          >
                            {triageStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Inner counter */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base font-black text-slate-800 font-mono tracking-tight leading-none">
                          {records.length}
                        </span>
                        <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">
                          Total
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tiny horizontal legends */}
                  <div className="grid grid-cols-4 gap-1 text-center">
                    {triageStats.map((item) => (
                      <div key={item.key} className="flex flex-col items-center">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className="text-[9px] font-black text-slate-705 mt-0.5 font-mono">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-2xl">
                <span className="text-slate-450 text-[10px] font-black uppercase tracking-wider pl-1.5">Filter Triase:</span>
                <button
                  onClick={() => { setTriageFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider border transition-all cursor-pointer ${
                    triageFilter === 'all'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-205 hover:bg-slate-100'
                  }`}
                >
                  Semua ({records.length})
                </button>
                {triageStats.map(item => (
                  <button
                    key={item.key}
                    onClick={() => { setTriageFilter(item.key); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      triageFilter === item.key
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white text-slate-655 border-slate-205 hover:bg-slate-100'
                    }`}
                    style={{
                      backgroundColor: triageFilter === item.key ? item.color : undefined
                    }}
                  >
                    <span 
                      className="h-1.5 w-1.5 rounded-full" 
                      style={{ backgroundColor: triageFilter === item.key ? '#ffffff' : item.color }}
                    ></span>
                    <span>{item.name} ({item.count})</span>
                  </button>
                ))}
              </div>

              {/* Search utility and count banner */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama pasien, No Reg, tindakan, pelaksana..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-slate-500 text-xs font-semibold">
                  Menampilkan <span className="text-teal-700 font-bold">{filteredRecords.length}</span> dari {records.length} registrasi pelayanan
                </div>
              </div>

              {/* Main Table Accordion */}
              {filteredRecords.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center">
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Daftar Kunjungan Kosong</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Gunakan filter pencarian lain atau tambahkan pendaftaran pasien rawat jalan baru.</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-150/60 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-150 text-[10.5px] text-slate-500 font-semibold tracking-wider uppercase">
                          <th className="px-6 py-4.5">No. Registrasi / RM</th>
                          <th className="px-6 py-4.5">Nama Lengkap Pasien</th>
                          <th className="px-6 py-4.5">Tanggal Kunjungan</th>
                          <th className="px-6 py-4.5 text-center">Jumlah Tindakan</th>
                          <th className="px-6 py-4.5 text-right">Subtotal Biaya</th>
                          <th className="px-6 py-4.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {paginatedRecords.map((rec) => {
                          const isExpanded = expandedId === rec.id;
                          const totalCost = rec.tindakan.reduce((sum, t) => sum + t.subtotal, 0);

                          return (
                            <React.Fragment key={rec.id}>
                              <tr className="hover:bg-slate-50/30 transition-all">
                                <td className="px-6 py-4.5">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-900 font-mono text-[11.5px]">{rec.no_registrasi}</span>
                                    <span className="text-slate-400 font-mono text-[10px] mt-0.5">RM: #{rec.no_rm}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4.5">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-800 uppercase tracking-wide">{rec.nama_pasien}</span>
                                    {rec.triase && (
                                      <div className="mt-1">
                                        {(() => {
                                          const ts = getTriageStyle(rec.triase);
                                          return (
                                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${ts.bg}`}>
                                              <span className={`h-1 w-1 rounded-full ${ts.dotBg}`}></span>
                                              <span>{ts.text.split(' / ')[0]}</span>
                                            </span>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4.5 font-normal text-slate-650">
                                  {new Date(rec.tanggal_pelayanan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4.5 text-center">
                                  <span className="inline-flex items-center px-2.5 py-1 text-xxs font-semibold bg-teal-50 border border-teal-150 text-teal-700 rounded-lg">
                                    {rec.tindakan.length} Tindakan
                                  </span>
                                </td>
                                <td className="px-6 py-4.5 text-right font-semibold text-slate-900 font-mono">
                                  Rp {totalCost.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4.5">
                                  <div className="flex items-center justify-center space-x-1.5">
                                    <button
                                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                      className="p-1.5 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded-lg transition-all cursor-pointer"
                                      title="Detail Tindakan"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                    <button
                                      onClick={() => handleEditClick(rec)}
                                      className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 bg-amber-50 hover:shadow-xs border border-amber-150 rounded-lg transition-all cursor-pointer"
                                      title="Koreksi Data"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id)}
                                      className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-150 rounded-lg transition-all cursor-pointer"
                                      title="Hapus / Void"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Accordion inner tindakan rows */}
                              {isExpanded && (
                                <tr className="bg-slate-50/70">
                                  <td colSpan={6} className="px-6 py-4.5 border-t border-b border-slate-150">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                        <h4 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                                          <span>Rincian Tindakan Pelayanan Medis</span>
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Kode Kunjungan Unik: ID #{rec.id}</span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rec.tindakan.map((t, index) => (
                                          <div key={index} className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xxs flex flex-col justify-between space-y-4">
                                            {/* Header */}
                                            <div>
                                              <div className="flex items-start justify-between">
                                                <h5 className="font-extrabold text-slate-800 text-[12px] leading-snug uppercase max-w-[14rem] truncate" title={t.tindakan_nama}>
                                                  {t.tindakan_nama}
                                                </h5>
                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                  x{t.jumlah}
                                                </span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-mono mt-1 flex items-center space-x-1">
                                                <Clock className="h-3 w-3 inline-block" />
                                                <span>{t.tindakan_tanggal} pukul {t.tindakan_jam}</span>
                                              </p>
                                            </div>

                                            {/* Details cost */}
                                            <div className="bg-slate-50 p-2.5 rounded-xl space-y-1 text-slate-500 text-[10px] font-semibold">
                                              <div className="flex justify-between">
                                                <span>Tarif Tindakan:</span>
                                                <span className="font-mono">Rp {(t.tarif_tindakan).toLocaleString('id-ID')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Tarif Sarana:</span>
                                                <span className="font-mono">Rp {(t.tarif_sarana).toLocaleString('id-ID')}</span>
                                              </div>
                                              <div className="flex justify-between col">
                                                <span>Tarif Pelayanan:</span>
                                                <span className="font-mono">Rp {(t.tarif_pelayanan).toLocaleString('id-ID')}</span>
                                              </div>
                                              {t.tarif_medis > 0 && (
                                                <div className="flex justify-between col">
                                                  <span>Tarif Jasa Medis:</span>
                                                  <span className="font-mono text-emerald-600">Rp {(t.tarif_medis).toLocaleString('id-ID')}</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Footer row */}
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                                              <div>
                                                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Pelaksana Medis</span>
                                                <span className="font-extrabold text-teal-750">{t.pelaksana || 'Petugas Medis'}</span>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Subtotal</span>
                                                <span className="font-black text-slate-900 text-xs font-mono">Rp {t.subtotal.toLocaleString('id-ID')}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 p-4 bg-slate-50/50 gap-4">
                      <div className="text-xs text-slate-500 font-semibold pl-2">
                        Menampilkan <span className="font-bold text-slate-800">{Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredRecords.length, currentPage * itemsPerPage)}</span> dari <span className="font-bold text-teal-700">{filteredRecords.length}</span> kunjungan {triageFilter !== 'all' ? `berdasarkan triase ${triageFilter}` : ''}
                      </div>
                      <div className="flex items-center space-x-1 pr-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Sebelumnya
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                          if (totalPages > 6 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                            if (page === 2 || page === totalPages - 1) {
                              return <span key={page} className="text-slate-400 text-xs px-2 select-none">...</span>;
                            }
                            return null;
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`h-8 w-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                currentPage === page
                                  ? 'bg-teal-600 text-white shadow-xs'
                                  : 'border border-slate-200 bg-white text-slate-650 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE TEXT BULK IMPORTER */}
          {activeTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Text Area Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                <div>
                  <span className="text-[9px] bg-slate-100 border border-slate-205 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest leading-none">Automatic Pattern Reader</span>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display mt-2">Impor Data Hasil Salinan Excel</h3>
                  <p className="text-xs text-slate-400 mt-1">Tempelkan seluruh baris tabel spreadsheet Anda di bawah ini. Pastikan menyertakan baris header / judul kolom untuk memudahkan pembacaan.</p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={6}
                    placeholder={`NO\tNO. REGISTRASI\tNO. RM\tPASIEN\tPELAKSANA\tTINDAKAN NAMA\tTINDAKAN TANGGAL\tTINDAKAN JAM\tTINDAKAN (Rp)\tJUMLAH\tSUBTOTAL (Rp)\n1\tRJ07062026-00001\t002502\tMADE YULIANA\tDea Oktarika\tKONSULTASI DOKTER\t07-06-2026\t10:09:57\t35.000\t1\t35.000`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-700 font-mono leading-relaxed rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none"
                    style={{ fontSize: '12px', fontWeight: 'normal' }}
                    disabled={submitting}
                  />

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={triggerParser}
                      className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border-l-2 border-teal-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
                      disabled={submitting || !rawText.trim()}
                    >
                      <Upload className="h-4 w-4 text-teal-400" />
                      <span>Proses & Urai Data</span>
                    </button>
                    {isParsed && (
                      <button
                        onClick={() => { setRawText(''); setParsedData([]); setIsParsed(false); }}
                        className="text-slate-400 hover:text-slate-650 text-xs font-bold transition-all"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Parsed Result Preview */}
              <div className="space-y-4">
                {isParsed ? (
                  <div className="bg-white p-6 rounded-3xl border border-teal-150 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-850">Pratinjau Hasil Pembacaan</h4>
                        <p className="text-[10.5px] text-emerald-600 font-bold mt-1">Ditemukan {parsedData.length} grup kunjungan pasien rawat jalan</p>
                      </div>
                      <span className="h-10 w-10 text-emerald-600 bg-emerald-50 rounded-full flex items-center justify-center font-black text-xs">
                        {parsedData.length}
                      </span>
                    </div>

                    {/* Preview patient block loop */}
                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                      {parsedData.map((p, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-sans space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold tracking-wide text-slate-800 text-xs uppercase block">{p.nama_pasien}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Reg: {p.no_registrasi} • RM: #{p.no_rm}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-slate-400 font-medium">{p.tanggal_pelayanan}</span>
                                <select 
                                    className="text-[10px] font-bold border rounded-lg p-1 bg-white"
                                    value={p.triase || 'hijau'}
                                    onChange={(e) => {
                                        const newData = [...parsedData];
                                        newData[idx].triase = e.target.value;
                                        setParsedData(newData);
                                    }}
                                >
                                    <option value="hijau">Hijau</option>
                                    <option value="kuning">Kuning</option>
                                    <option value="hitam">Hitam</option>
                                    <option value="merah">Merah</option>
                                </select>
                            </div>
                          </div>

                          {/* Action list summary */}
                          <div className="border-t border-slate-200/50 pt-2 space-y-1 text-[10px] font-semibold text-slate-600">
                            {p.tindakan.map((t: any, tIdx: number) => (
                              <div key={tIdx} className="flex justify-between">
                                <span className="truncate max-w-[15rem]">• {t.tindakan_nama}</span>
                                <span className="font-mono text-slate-800">Rp {t.subtotal.toLocaleString('id-ID')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit bulk save button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center space-x-3">
                      <button
                        onClick={handleBulkInsert}
                        className="flex-1 inline-flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-teal-700/10 cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                            <span>Mendaftarkan pasien...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Simpan Ke Database ({parsedData.length} Kunjungan)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl border border-slate-200/70 p-12 text-center text-slate-400 space-y-3 py-20">
                    <ClipboardList className="h-12 w-12 text-slate-300 mx-auto" />
                    <h4 className="text-xs font-extrabold uppercase text-slate-500">Menunggu Input Data</h4>
                    <p className="text-xxs leading-relaxed max-w-xs mx-auto">Silakan tempelkan data tindakan rawat jalan dari Excel Anda pada area teks di sebelah kiri, kemudian klik "Proses & Urai Data".</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANUAL CRUD REGISTRATION & CORRECTION MODAL */}
          {isManualModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-4xl rounded-3xl border border-slate-150 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/75">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 font-display">
                      {isEditMode ? 'Form Koreksi Pelayanan Rawat Jalan' : 'Form Registrasi Pelayanan Rawat Jalan'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Input detail data kunjungan beserta rincian tarif tindakan</p>
                  </div>
                  <button
                    onClick={resetManualForm}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Form Scrollable Wrapper */}
                <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Section A: Demography */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">A. Identitas & Demutasi Kunjungan</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">No. Registrasi</label>
                        <input
                          type="text"
                          placeholder="Contoh: RJ16062026-00001"
                          value={noRegistrasi}
                          onChange={(e) => setNoRegistrasi(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          disabled={isEditMode}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">No. Rekam Medis (RM)</label>
                        <input
                          type="text"
                          placeholder="Contoh: 002502"
                          value={noRm}
                          onChange={(e) => setNoRm(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Nama Pasien</label>
                        <input
                          type="text"
                          placeholder="Contoh: MADE YULIANA"
                          value={namaPasien}
                          onChange={(e) => setNamaPasien(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Pelayanan</label>
                        <input
                          type="date"
                          value={tanggalPelayanan}
                          onChange={(e) => setTanggalPelayanan(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Triase</label>
                        <select
                          value={triase}
                          onChange={(e) => setTriase(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="hijau">Hijau</option>
                          <option value="kuning">Kuning</option>
                          <option value="hitam">Hitam</option>
                          <option value="merah">Merah</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Actions list */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">B. Daftar Tindakan Medikasi & Jasa Pelaksana</h4>
                      <button
                        type="button"
                        onClick={addManualTindakanRow}
                        className="inline-flex items-center space-x-1.5 text-xxs font-extrabold bg-teal-50 border border-teal-150 text-teal-700 px-2.5 py-1.5 rounded-lg hover:bg-teal-100 transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah Tindakan</span>
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {manualTindakan.map((t, index) => (
                        <div key={index} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 relative space-y-3">
                          {/* Remove button */}
                          {manualTindakan.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManualTindakanRow(index)}
                              className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 p-1 bg-white hover:bg-rose-50 border border-slate-200/50 rounded-lg transition-all"
                              title="Hapus baris ini"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <span className="text-[10px] text-teal-700 font-extrabold uppercase block tracking-wider">Tindakan #{index + 1}</span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Nama Tindakan</label>
                              <input
                                type="text"
                                placeholder="KONSULTASI DOKTER / INJEKSI"
                                value={t.tindakan_nama}
                                onChange={(e) => {
                                  const updated = [...manualTindakan];
                                  updated[index].tindakan_nama = e.target.value;
                                  setManualTindakan(updated);
                                }}
                                className="mt-1 block w-full px-2.5 py-1.5 bg-white border border-slate-205 rounded-lg text-xs"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Petugas Pelaksana</label>
                              <input
                                type="text"
                                placeholder="dr. Muhammad Jundi Nasrullah"
                                value={t.pelaksana}
                                onChange={(e) => {
                                  const updated = [...manualTindakan];
                                  updated[index].pelaksana = e.target.value;
                                  setManualTindakan(updated);
                                }}
                                className="mt-1 block w-full px-2.5 py-1.5 bg-white border border-slate-205 rounded-lg text-xs"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Keterangan Tambahan</label>
                              <input
                                type="text"
                                placeholder="Opsional"
                                value={t.tindakan_keterangan}
                                onChange={(e) => {
                                  const updated = [...manualTindakan];
                                  updated[index].tindakan_keterangan = e.target.value;
                                  setManualTindakan(updated);
                                }}
                                className="mt-1 block w-full px-2.5 py-1.5 bg-white border border-slate-205 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          {/* Cost Matrix breakdowns */}
                          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Tarif Alat (Rp)</label>
                              <input
                                type="number"
                                value={t.tarif_tindakan}
                                onChange={(e) => updateTarifFields(index, 'tarif_tindakan', Number(e.target.value))}
                                className="mt-1 block w-full px-2.5 py-1 bg-white border border-slate-205 rounded-lg text-xs font-mono"
                                min={0}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Tarif Sarana</label>
                              <input
                                type="number"
                                value={t.tarif_sarana}
                                onChange={(e) => updateTarifFields(index, 'tarif_sarana', Number(e.target.value))}
                                className="mt-1 block w-full px-2.5 py-1 bg-white border border-slate-205 rounded-lg text-xs font-mono"
                                min={0}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Tarif Pelayanan</label>
                              <input
                                type="number"
                                value={t.tarif_pelayanan}
                                onChange={(e) => updateTarifFields(index, 'tarif_pelayanan', Number(e.target.value))}
                                className="mt-1 block w-full px-2.5 py-1 bg-white border border-slate-205 rounded-lg text-xs font-mono"
                                min={0}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Tarif Medis</label>
                              <input
                                type="number"
                                value={t.tarif_medis}
                                onChange={(e) => updateTarifFields(index, 'tarif_medis', Number(e.target.value))}
                                className="mt-1 block w-full px-2.5 py-1 bg-white border border-slate-205 rounded-lg text-xs font-mono"
                                min={0}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase">Jumlah (Qty)</label>
                              <input
                                type="number"
                                value={t.jumlah}
                                onChange={(e) => updateTarifFields(index, 'jumlah', Number(e.target.value))}
                                className="mt-1 block w-full px-2.5 py-1 bg-white border border-slate-205 rounded-lg text-xs font-mono"
                                min={1}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-500 uppercase text-slate-400">Subtotal</label>
                              <input
                                type="text"
                                value={`Rp ${t.subtotal.toLocaleString('id-ID')}`}
                                className="mt-1 block w-full px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-black text-slate-700"
                                disabled
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit button bar */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetManualForm}
                      className="px-5 py-2.5 border border-slate-250 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs cursor-pointer"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                          <span>Sedang menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>{isEditMode ? 'Simpan Koreksi' : 'Daftarkan Pelayanan'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
