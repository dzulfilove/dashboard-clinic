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
  Bed
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
import { ICD10 } from '../../types.js';

interface Tindakan {
  id?: number;
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

interface InpatientRecord {
  id: number;
  no_registrasi: string;
  no_rm: string;
  nama_pasien: string;
  tanggal_pelayanan: string;
  icd_masuk: string;
  icd_pulang: string;
  kamar: string;
  triase: string;
  dpjp: string;
  tindakan: Tindakan[];
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

export default function RawatInap() {
  const [records, setRecords] = useState<InpatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [triageFilter, setTriageFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'statistik' | 'kunjungan' | 'input'>('statistik');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit / Input States
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  
  // Modal states for manual form
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Form states for manual registration
  const [noRegistrasi, setNoRegistrasi] = useState('');
  const [noRm, setNoRm] = useState('');
  const [namaPasien, setNamaPasien] = useState('');
  const [tanggalPelayanan, setTanggalPelayanan] = useState(new Date().toISOString().split('T')[0]);
  const [triase, setTriase] = useState('hijau');
  const [kamar, setKamar] = useState('Kamar Sinta');
  const [icdMasuk, setIcdMasuk] = useState('');
  const [icdPulang, setIcdPulang] = useState('');
  const [dpjp, setDpjp] = useState('');
  
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [procedureFilter, setProcedureFilter] = useState<string | null>(null);
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [dokterList, setDokterList] = useState<any[]>([]);
  const [manualTindakan, setManualTindakan] = useState<any[]>([
    {
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

  // Bulk paste text state
  const [rawText, setRawText] = useState('');
  const [isParsed, setIsParsed] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

  // Fetch inpatient records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/pelayanan/ranap?startDate=${startDate}&endDate=${endDate}`);
      setRecords(res.data);
    } catch (err: any) {
      console.error(err);
      showFeedback('error', 'Gagal memuat data kunjungan rawat inap.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch diagnostic code lists (ICD-10)
  const fetchIcd10 = async () => {
    try {
      const r = await api.get('/pelayanan/icd10');
      setIcdList(r.data);
    } catch (err) {
      console.warn('Gagal memuat master ICD-10:', err);
    }
  };

  const fetchDokter = async () => {
    try {
      const res = await api.get('/dokter');
      setDokterList(res.data);
    } catch (err) {
      console.warn('Gagal memuat master Dokter:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchIcd10();
    fetchDokter();
  }, [startDate, endDate]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // Initialize registration code automatically
  const generateNoRegistrasi = () => {
    if (isEditMode) return;
    const now = new Date();
    const cleanDate = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setNoRegistrasi(`RI${cleanDate}-${rand}`);
  };

  const handleOpenNewModal = () => {
    setIsEditMode(false);
    setEditTargetId(null);
    setNoRm('');
    setNamaPasien('');
    setTanggalPelayanan(new Date().toISOString().split('T')[0]);
    setTriase('hijau');
    setKamar('Kamar Sinta');
    setIcdMasuk('');
    setIcdPulang('');
    setDpjp('');
    setManualTindakan([
      {
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
    generateNoRegistrasi();
    setIsManualModalOpen(true);
  };

  const handleOpenEditModal = (rec: InpatientRecord) => {
    setNoRegistrasi(rec.no_registrasi);
    setNoRm(rec.no_rm);
    setNamaPasien(rec.nama_pasien);
    setTanggalPelayanan(rec.tanggal_pelayanan);
    setTriase(rec.triase || 'hijau');
    setKamar(rec.kamar || 'Kamar Sinta');
    setIcdMasuk(rec.icd_masuk || '');
    setIcdPulang(rec.icd_pulang || '');
    setDpjp(rec.dpjp || '');
    
    // map tindakan
    setManualTindakan(rec.tindakan.map((t: any) => ({
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
    if (!window.confirm('Apakah Anda yakin ingin menghapus kunjungan pasien rawat inap ini secara permanen?')) return;
    try {
      await api.delete(`/pelayanan/ranap/${id}`);
      showFeedback('success', 'Data kunjungan berhasil dihapus.');
      fetchRecords();
    } catch (err) {
      showFeedback('error', 'Gagal menghapus data kunjungan.');
    }
  };

  // Helper function to parse Indonesian date strings (e.g., "13 April 2001" or "19 Juni 2026") into YYYY-MM-DD
  const parseIndoDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const str = dateStr.trim().toLowerCase();
    
    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    
    // Check if it's DD-MM-YYYY or DD/MM/YYYY
    const delimiterMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (delimiterMatch) {
      const d = delimiterMatch[1].padStart(2, '0');
      const m = delimiterMatch[2].padStart(2, '0');
      const y = delimiterMatch[3];
      return `${y}-${m}-${d}`;
    }

    const monthMap: { [key: string]: string } = {
      januari: '01', jan: '01',
      februari: '02', feb: '02',
      maret: '03', mar: '03',
      april: '04', apr: '04',
      mei: '05',
      juni: '06', jun: '06',
      juli: '07', jul: '07',
      agustus: '08', agu: '08', agst: '08',
      september: '09', sep: '09',
      oktober: '10', okt: '10',
      november: '11', nopember: '11', nov: '11',
      desember: '12', des: '12',
    };

    const parts = str.split(/\s+/);
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const mStr = parts[1];
      const y = parts[2];
      const m = monthMap[mStr] || '01';
      if (/^\d{1,2}$/.test(d) && /^\d{4}$/.test(y)) {
        return `${y}-${m}-${d}`;
      }
    }

    // Fallback parser for standard Date
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch (e) {
      // ignore
    }

    return new Date().toISOString().split('T')[0];
  };

  // Paste Text Parser Suite
  const triggerParser = () => {
    if (!rawText.trim()) {
      showFeedback('error', 'Teks kosong. Tempelkan data berpola tabel terlebih dahulu.');
      return;
    }

    const lines = rawText.split('\n');
    const tempActions: any[] = [];
    
    // Detect if we are using the new format containing customized columns (e.g. No. Pendaftaran, Tanggal MRS/KRS)
    const lowerText = rawText.toLowerCase();
    const isNewFormat = lowerText.includes('pendaftaran') || lowerText.includes('mrs') || lowerText.includes('krs') || lowerText.includes('tanggal lahir');

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
      const isHeader = cols[0]?.toLowerCase().includes('no') || 
                       cols[1]?.toLowerCase().includes('registrasi') || 
                       cols[1]?.toLowerCase().includes('pendaftaran') ||
                       cols[1]?.toLowerCase().includes('reg') ||
                       cols[2]?.toLowerCase().includes('rm') ||
                       cols[3]?.toLowerCase().includes('nama');
      if (isHeader) {
        continue;
      }

      const cleanNum = (str: string) => {
        if (!str) return 0;
        const stripped = str.replace(/[^\d]/g, '');
        return Number(stripped) || 0;
      };

      if (isNewFormat) {
        // Handle custom format columns:
        // No. | No. Pendaftaran | No. RM | Nama Pasien | Tanggal Lahir | Umur | Jenis Kelamin | Alamat | Kelurahan | Kecamatan | Kota | Nama Tindakan | Tanggal MRS | Tanggal KRS | Unit | Jumlah
        if (cols.length < 12) {
          continue; // incomplete line schema
        }

        const noReg = cols[1];
        const noRmCode = cols[2];
        const pName = cols[3];
        const tBirth = cols[4] || '';
        const tAge = cols[5] || '';
        const tGender = cols[6] || '';
        const tAddress = cols[7] || '';
        const tKel = cols[8] || '';
        const tKec = cols[9] || '';
        const tKota = cols[10] || '';
        const tName = cols[11];
        const tMRS = cols[12] || '';
        const tKRS = cols[13] || '';
        const tUnit = cols[14] || 'Poli Umum';
        const qty_str = cols[15] || '1';

        const qty = cleanNum(qty_str) || 1;
        const formattedDate = parseIndoDate(tMRS);

        // Put descriptive patient info in tindakan_keterangan so it is saved and shown transparently
        const descriptionParts = [];
        if (tBirth) descriptionParts.push(`Tgl Lahir: ${tBirth}`);
        if (tAge) descriptionParts.push(`Umur: ${tAge}`);
        if (tGender) descriptionParts.push(`JK: ${tGender}`);
        if (tAddress || tKel || tKec || tKota) {
          descriptionParts.push(`Alamat: ${[tAddress, tKel, tKec, tKota].filter(Boolean).join(', ')}`);
        }
        if (tKRS) descriptionParts.push(`Tanggal KRS: ${tKRS}`);
        const tKet = descriptionParts.join(' | ');

        if (noReg && pName && tName) {
          tempActions.push({
            no_registrasi: noReg,
            no_rm: noRmCode,
            nama_pasien: pName,
            tanggal_pelayanan: formattedDate,
            dpjp: 'Dokter Penanggung Jawab',
            tindakan_nama: tName,
            tindakan_keterangan: tKet,
            tindakan_tanggal: formattedDate,
            tindakan_jam: '08:00:00',
            tarif_tindakan: 0,
            tarif_sarana: 0,
            tarif_pelayanan: 0,
            tarif_medis: 0,
            jumlah: qty,
            subtotal: 0,
            kamar: tUnit
          });
        }
      } else {
        // Handle original format columns:
        // O | NO. REGISTRASI | NO. RM | PASIEN | PELAKSANA | TINDAKAN NAMA | TINDAKAN TANGGAL | TINDAKAN JAM | JUMLAH | SARANA(Rp) | PELAYANAN(Rp) | MEDIS(Rp) | TINDAKAN BIAYA(Rp) | SUBTOTAL(Rp)
        if (cols.length < 6) {
          continue; // incomplete line schema
        }

        const idNo = cols[0];
        const noReg = cols[1];
        const noRmCode = cols[2];
        const pName = cols[3];
        const exec = cols[4];
        const tName = cols[5];
        const tTgl = cols[6] || '';
        const tJam = cols[7] || '08:00:00';

        const qty = cleanNum(cols[8]) || 1;
        const tSarana = cleanNum(cols[9]);
        const tPel = cleanNum(cols[10]);
        const tMedis = cleanNum(cols[11]);
        const tTarif = cleanNum(cols[12]);
        const sub = cleanNum(cols[13]) || ((tTarif + tSarana + tPel + tMedis) * qty);

        const formattedDate = parseIndoDate(tTgl);

        if (noReg && pName && tName) {
          tempActions.push({
            no_registrasi: noReg,
            no_rm: noRmCode,
            nama_pasien: pName,
            tanggal_pelayanan: formattedDate,
            dpjp: exec,
            tindakan_nama: tName,
            tindakan_keterangan: '',
            tindakan_tanggal: formattedDate,
            tindakan_jam: tJam,
            tarif_tindakan: tTarif,
            tarif_sarana: tSarana,
            tarif_pelayanan: tPel,
            tarif_medis: tMedis,
            jumlah: qty,
            subtotal: sub,
            kamar: 'Kamar Sinta'
          });
        }
      }
    }

    // Now Group on NO_REGISTRASI
    const groupedMap: { [key: string]: any } = {};
    for (const act of tempActions) {
      const key = act.no_registrasi;
      if (!groupedMap[key]) {
        let parsedKamar = act.kamar || 'Kamar Sinta';
        const cleanKamar = parsedKamar.trim().toLowerCase();
        if (cleanKamar.includes('sinta')) {
          parsedKamar = 'Kamar Sinta';
        } else if (cleanKamar.includes('rama')) {
          parsedKamar = 'Kamar Rama';
        } else if (cleanKamar.includes('yudistira')) {
          parsedKamar = 'Kamar Yudistira';
        } else {
          parsedKamar = 'Kamar Sinta';
        }

        groupedMap[key] = {
          no_registrasi: act.no_registrasi,
          no_rm: act.no_rm,
          nama_pasien: act.nama_pasien,
          tanggal_pelayanan: act.tanggal_pelayanan,
          triase: 'hijau',
          dpjp: act.dpjp,
          kamar: parsedKamar,
          icd_masuk: '',
          icd_pulang: '',
          tindakan: []
        };
      }
      groupedMap[key].tindakan.push({
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

    const finalGrouped = Object.values(groupedMap);
    if (finalGrouped.length === 0) {
      showFeedback('error', 'Gagal mengurai teks. Pastikan data tabel sesuai dengan format yang didukung.');
      return;
    }

    setParsedData(finalGrouped);
    setIsParsed(true);
    showFeedback('success', `Berhasil memilah ${finalGrouped.length} baris master kunjungan rawat inap.`);
  };

  const handleBulkInsert = async () => {
    setSubmitting(true);
    let successCount = 0;
    try {
      for (const group of parsedData) {
        // Post current group to ranap service endpoint
        await api.post('/pelayanan/ranap', group);
        successCount++;
      }
      showFeedback('success', `Berhasil memasukkan ${successCount} data kunjungan rawat inap secara total.`);
      
      // reset states
      setRawText('');
      setParsedData([]);
      setIsParsed(false);
      fetchRecords();
      setActiveTab('kunjungan');
    } catch (err: any) {
      console.error(err);
      showFeedback('error', `Gagal menyimpan massal: Terakhir tersimpan ${successCount}. Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, triageFilter, roomFilter, procedureFilter, startDate, endDate]);

  // Filtered lists
  const filteredRecords = useMemo(() => {
    return (Array.isArray(records) ? records : []).filter(rec => {
      const q = searchQuery.toLowerCase();
      const matchesTriage = triageFilter === 'all' || String(rec.triase || 'hijau').toLowerCase() === triageFilter;
      const matchesRoom = roomFilter === 'all' || (rec.kamar || 'Flamboyan 1') === roomFilter;
      const matchesProcedure = !procedureFilter || rec.tindakan.some(t => t.tindakan_nama === procedureFilter);
      const matchesSearch = (
        rec.nama_pasien.toLowerCase().includes(q) ||
        rec.no_registrasi.toLowerCase().includes(q) ||
        rec.no_rm.toLowerCase().includes(q) ||
        rec.tindakan.some((t: any) => t.tindakan_nama.toLowerCase().includes(q)) ||
        (rec.icd_masuk && rec.icd_masuk.toLowerCase().includes(q)) ||
        (rec.icd_pulang && rec.icd_pulang.toLowerCase().includes(q))
      );
      return matchesTriage && matchesRoom && matchesProcedure && matchesSearch;
    });
  }, [records, searchQuery, triageFilter, roomFilter, procedureFilter]);

  // Statistics for infographics
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

  // Pagination bounds
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Analytics helper variables
  const totalVisits = filteredRecords.length;
  const totalIncome = filteredRecords.reduce((sum, r) => sum + r.tindakan.reduce((sub, t) => sub + t.subtotal, 0), 0);
  const totalProcedures = filteredRecords.reduce((sum, r) => sum + r.tindakan.length, 0);

  const allRooms = useMemo(() => {
    const uniques = new Set<string>();
    (Array.isArray(records) ? records : []).forEach(r => {
      if (r.kamar) uniques.add(r.kamar);
    });
    return Array.from(uniques).sort();
  }, [records]);

  // Group distributions
  const procedureMap: { [key: string]: number } = {};
  const roomMap: { [key: string]: number } = {};
  const dateMap: { [key: string]: { kunjungan: number; pendapatan: number } } = {};

  filteredRecords.forEach(r => {
    const dStr = r.tanggal_pelayanan;
    if (!dateMap[dStr]) dateMap[dStr] = { kunjungan: 0, pendapatan: 0 };
    dateMap[dStr].kunjungan += 1;

    // Room count
    const rm = r.kamar || 'Flamboyan 1';
    roomMap[rm] = (roomMap[rm] || 0) + 1;

    r.tindakan.forEach(t => {
      procedureMap[t.tindakan_nama] = (procedureMap[t.tindakan_nama] || 0) + 1;
      dateMap[dStr].pendapatan += t.subtotal;
    });
  });

  // Top active rooms
  const chartRoomData = Object.entries(roomMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Most Active Room
  let topRoom = '-';
  let topRoomCount = 0;
  Object.entries(roomMap).forEach(([name, count]) => {
    if (count > topRoomCount) {
      topRoom = name;
      topRoomCount = count;
    }
  });

  // Top 5 treatments for chart
  const chartTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const chartTrendData = Object.entries(dateMap)
    .map(([tanggal, val]) => ({
      tanggal: new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      kunjungan: val.kunjungan,
      pendapatan: Math.round(val.pendapatan / 1000) // in thousand Rp
    }))
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Handle addition/changes of manual manualTindakan elements
  const addTindakanField = () => {
    setManualTindakan([
      ...manualTindakan,
      {
        dpjp: '',
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
  };

  const removeTindakanField = (idx: number) => {
    if (manualTindakan.length === 1) return;
    setManualTindakan(manualTindakan.filter((_, i) => i !== idx));
  };

  const updateTindakanField = (idx: number, field: keyof Tindakan, val: any) => {
    const updated = [...manualTindakan];
    const item = { ...updated[idx] };

    if (field === 'tarif_tindakan' || field === 'tarif_sarana' || field === 'tarif_pelayanan' || field === 'tarif_medis') {
      item[field] = Number(val) || 0;
      // Recalc subtotal
      item.subtotal = (Number(item.tarif_tindakan || 0) + Number(item.tarif_sarana || 0) + Number(item.tarif_pelayanan || 0) + Number(item.tarif_medis || 0)) * (item.jumlah || 1);
    } else if (field === 'jumlah') {
      item.jumlah = Number(val) || 1;
      item.subtotal = (Number(item.tarif_tindakan || 0) + Number(item.tarif_sarana || 0) + Number(item.tarif_pelayanan || 0) + Number(item.tarif_medis || 0)) * item.jumlah;
    } else {
      (item as any)[field] = val;
    }
    updated[idx] = item;
    setManualTindakan(updated);
  };

  // Submit manual registration
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noRegistrasi || !noRm || !namaPasien || !tanggalPelayanan) {
      showFeedback('error', 'Semua data penanda kunjungan wajib diisi.');
      return;
    }

    setSubmitting(true);
    const body = {
      no_registrasi: noRegistrasi,
      no_rm: noRm,
      nama_pasien: namaPasien,
      tanggal_pelayanan: tanggalPelayanan,
      triase,
      icd_masuk: icdMasuk || null,
      icd_pulang: icdPulang || null,
      kamar,
      dpjp,
      tindakan: manualTindakan
    };

    try {
      if (isEditMode && editTargetId) {
        await api.put(`/pelayanan/ranap/${editTargetId}`, body);
        showFeedback('success', 'Data kunjungan ranap berhasil diperbarui.');
      } else {
        await api.post('/pelayanan/ranap', body);
        showFeedback('success', 'Pendaftaran Rawat Inap berhasil disimpan.');
      }
      setIsManualModalOpen(false);
      fetchRecords();
      setActiveTab('kunjungan');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan pendaftaran.';
      showFeedback('error', `Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Bed className="h-5 w-5 text-teal-600" />
            <span>Rawat Inap (Inpatient Services)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Pencatatan log kunjungan medis, rincian tindakan, penempatan kamar bed, kode diagnosis masuk/pulang, dan rekapitulasi pelayanan rawat inap.
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
            onClick={handleOpenNewModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Registrasi Manual</span>
          </button>
        </div>
      </div>

      {/* Interactive Floating Feedback Screen */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-50 flex items-center space-x-3 p-4 rounded-xl shadow-lg border text-xs font-bold leading-none ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                : 'bg-rose-50 border-rose-250 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT STAGE ROUTEMAP */}
      {loading ? (
        <div className="h-64 bg-white rounded-3xl border border-slate-150/60 shadow-xs flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-9 w-9 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-widest block">Menghubungkan Database VPS...</span>
          </div>
        </div>
      ) : (
        <div>
          {/* TAB 1: STATISTICS DASHBOARD ANALYTICS */}
          {activeTab === 'statistik' && (
            <div className="space-y-6">
              {/* Infographics Cards Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Kunjungan Pasien */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                      <Users className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
                      Kunjungan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {totalVisits} <span className="text-xs font-normal text-slate-450">Kasus</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Kunjungan Pasien Rawat Inap</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>

                {/* 2. Tindakan Medis */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
                      Tindakan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {totalProcedures} <span className="text-xs font-normal text-slate-450">Tindakan</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Tindakan Medis Dilakukan</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>



                {/* 4. Kamar Teraktif */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                      <Bed className="h-6 w-6 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-amber-100/80 text-amber-850 px-2.5 py-0.5 rounded-full">
                      Aktif
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-slate-900 tracking-tight font-display truncate leading-tight uppercase font-sans">
                      {topRoom}
                    </h3>
                    <p className="text-xxs font-mono text-amber-600 font-bold mt-1">
                      {topRoomCount} Kunjungan
                    </p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
                </motion.div>
              </div>

              {/* Graphical Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. REGISTRATION & EARNINGS TREND OVER TIME */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150/60 lg:col-span-8 flex flex-col space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">Tren Volume Kunjungan & Pendapatan Rawat Inap</h3>
                    <p className="text-xs text-slate-400">Statistik harian untuk pendaftaran pasien ranap beserta perolehan nominal subtotal tindakan.</p>
                  </div>
                  <div className="h-72 w-full">
                    {chartTrendData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Tidak ada data dalam rentang terpilih
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="tanggal" fontSize={10} tickLine={false} stroke="#94a3b8" />
                          <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Kunjungan (org)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }} />
                          <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Pendapatan (Ribu Rp)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#64748b' } }} />
                          <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar yAxisId="left" dataKey="kunjungan" name="Kunjungan" fill="#0d9488" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="pendapatan" name="Pendapatan (kRp)" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. AREA DISTRIBUTION: CHAMBER SELECTION */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150/60 lg:col-span-4 flex flex-col space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">Tingkat Okupansi Ruang Kamar</h3>
                    <p className="text-xs text-slate-400">Distribusi penempatan bed / kamar tidur pasien.</p>
                  </div>
                  <div className="h-56 w-full flex items-center justify-center">
                    {chartRoomData.length === 0 ? (
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tabel Kamar Kosong</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartRoomData}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {chartRoomData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="space-y-1.5 font-sans">
                    {chartRoomData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                        <div className="flex items-center space-x-1.5">
                          <span className="h-2 w-2 rounded-full block" style={{ background: COLORS[idx % COLORS.length] }}></span>
                          <span className="truncate max-w-[12rem]">{item.name}</span>
                        </div>
                        <span className="font-mono text-slate-900">{item.count} Pasien</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Infography distribution details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Triage Info Panel */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150/60 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">Status Triase Pasien Inap</h3>
                    <p className="text-xs text-slate-400">Pembagian kondisi kegawatan klinis pasien rawat inap pada periode ini.</p>
                  </div>
                  <div className="divide-y divide-slate-100 font-sans">
                    {triageStats.map((item, idx) => {
                      const style = getTriageStyle(item.key);
                      return (
                        <div key={idx} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center space-x-2.5">
                            <span className={`h-4 w-4 rounded-full flex items-center justify-center font-black ${style.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dotBg}`}></span>
                            </span>
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 block leading-none">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{item.desc}</span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black text-slate-900">{item.count} org</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top 5 list of Procedures */}
                <div className="bg-white p-6 rounded-3xl border border-slate-150/60 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">5 Layanan / Tindakan Terbanyak</h3>
                    <p className="text-xs text-slate-400">Aktivitas tindakan medis yang paling intens diberikan kepada pasien.</p>
                  </div>
                  <div className="divide-y divide-slate-100 font-sans">
                    {chartTreatmentData.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                        Belum ada tindakan medis tercatat
                      </div>
                    ) : (
                      chartTreatmentData.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2.5">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="h-6 w-6 rounded-lg bg-teal-50 border border-teal-150/50 flex items-center justify-center font-bold text-[10.5px] text-teal-600 flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-extrabold text-slate-700 truncate">{item.name}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 border border-slate-150 rounded-xl flex-shrink-0">
                            {item.count} Tindakan
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED PATIENTS TABLE (Daftar Kunjungan) */}
          {activeTab === 'kunjungan' && (
            <div className="space-y-6">
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
                        <span className="text-[9px] font-black text-slate-700 mt-0.5 font-mono">
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
                        : 'bg-white text-slate-600 border-slate-205 hover:bg-slate-100'
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
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
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

                <div className="relative">
                  <select
                    value={roomFilter}
                    onChange={(e) => {
                      setRoomFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-4 pr-8 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
                  >
                    <option value="all">Semua Ruang Kamar</option>
                    {allRooms.map((rm, i) => (
                      <option key={i} value={rm}>{rm}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
                  />
                </div>

                <div className="text-slate-500 text-xs font-semibold">
                  Menampilkan <span className="text-teal-700 font-bold">{filteredRecords.length}</span> dari {records.length} registrasi pelayanan
                </div>
              </div>

              {/* Main Content Card Container */}
              <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs">

              {/* Patient List Content Table */}
              {paginatedRecords.length === 0 ? (
                <div className="py-20 text-center space-y-3 font-sans">
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-extrabold text-slate-700">Tidak Ada Kunjungan Terbaca</p>
                    <p className="text-[10.5px] text-slate-400 max-w-sm mx-auto mt-1">Gunakan formulir manual atau impor teks excel salinan untuk memasukkan records pelayanan inap.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
                  {paginatedRecords.map((rec, idx) => {
                    const isExpanded = expandedId === rec.id;
                    const triageStyle = getTriageStyle(rec.triase);
                    const costTotal = rec.tindakan.reduce((sum, act) => sum + act.subtotal, 0);

                    return (
                      <div key={rec.id} className="py-4">
                        {/* Summary Header of element */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                          {/* Left patient identity columns */}
                          <div className="flex items-start space-x-3.5">
                            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-150 flex items-center justify-center text-slate-450 text-xs font-black relative flex-shrink-0">
                              {idx + 1 + (currentPage - 1) * itemsPerPage}
                              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white bg-emerald-500"></span>
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-slate-800 text-sm tracking-wide uppercase hover:text-teal-700 block transition-colors leading-none">
                                  {rec.nama_pasien}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 border border-teal-100 text-teal-700">
                                  {rec.kamar}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
                                  DPJP: {rec.dpjp || '-'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 font-mono">
                                <span className="font-black text-slate-600">Reg: {rec.no_registrasi}</span>
                                <span>•</span>
                                <span>RM Code: #{rec.no_rm}</span>
                                <span>•</span>
                                <span className="flex items-center text-slate-500 font-sans font-bold">
                                  <Clock className="h-3 w-3 mr-1 text-slate-400" />
                                  {new Date(rec.tanggal_pelayanan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              
                              {/* DIAGNOSA MASUK & PULANG LINE */}
                              <div className="flex flex-wrap gap-2 text-[10px] mt-1 text-slate-500">
                                {rec.icd_masuk && (
                                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg font-semibold">
                                    Diagnosa Masuk: <strong className="font-extrabold">{rec.icd_masuk}</strong>
                                  </span>
                                )}
                                {rec.icd_pulang && (
                                  <span className="bg-orange-50 border border-orange-100 text-orange-700 px-2 py-0.5 rounded-lg font-semibold">
                                    Diagnosa Pulang: <strong className="font-extrabold">{rec.icd_pulang}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right functional action buttons columns */}
                          <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0">
                            {/* Triage pill tag */}
                            <span className={`text-[10px] font-extrabold px-3 py-1.5 border rounded-xl leading-none flex items-center space-x-1.5 transition-all ${triageStyle.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${triageStyle.dotBg}`}></span>
                              <span>{triageStyle.text}</span>
                            </span>

                            {/* Total bill count */}
                            <div className="text-right">
                              <span className="text-[9.5px] text-slate-400 uppercase tracking-wider font-extrabold block leading-none">Jumlah Tindakan</span>
                              <span className="text-xs font-sans font-extrabold text-slate-800">{rec.tindakan.length} Tindakan</span>
                            </div>

                            <div className="flex items-center space-x-1 border-l border-slate-100 pl-3">
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                                title="Lihat detail tindakan"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(rec)}
                                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"
                                title="Edit kunjungan"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(rec.id)}
                                className="p-2 hover:bg-slate-50 text-slate-450 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                                title="Hapus kunjungan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable Child list of actions */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3.5 px-4 py-3 border-t border-slate-200">
                                <h4 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center space-x-1.5 mb-3">
                                  <span>Tindakan Medis Ranap ({rec.tindakan.length})</span>
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {rec.tindakan.map((t, tIdx) => (
                                    <div key={tIdx} className="bg-white p-4.5 rounded-2xl border border-slate-150 shadow-xxs flex flex-col justify-between space-y-4">
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
                                          <span>{new Date(t.tindakan_tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} pukul {t.tindakan_jam.substring(0, 5)}</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Interactive Pagination Buttons footer row */}
              {totalPages > 1 && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-bold text-slate-500 text-xs">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span>Halaman {currentPage} dari {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
              </div>
            </div>
          )}

          {/* TAB 3: EXCEL PASTE IMPORT PANEL */}
          {activeTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Text Area Input Card */}
               <div className="bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                <div>
                  <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest leading-none">Automatic Pattern Reader</span>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display mt-2 font-black">Impor Data Hasil Salinan Excel</h3>
                  <p className="text-xs text-slate-400 mt-1">Tempelkan seluruh baris tabel spreadsheet Anda di bawah ini sesuai pola kolom rawat inap (mendukung format pendaftaran & Unit).</p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={8}
                    placeholder={`Contoh Format Kolom Excel:\nNo.\tNo. Pendaftaran\tNo. RM\tNama Pasien\tTanggal Lahir\tUmur\tJenis Kelamin\tAlamat\tKelurahan\tKecamatan\tKota\tNama Tindakan\tTanggal MRS\tTanggal KRS\tUnit\tJumlah\n1\tRJ19062026-00001\t002576\tADIS SHANDRA RACHMAZANI\t13 April 2001\t25 Tahun\tPerempuan\tAddress\tKel\tKec\tKota\tHOMECARE PERAWAT\t19 Juni 2026\t19 Juni 2026\tPOLI UMUM\t1`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 text-slate-755 font-mono leading-relaxed rounded-2xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none"
                    style={{ fontSize: '11px', fontWeight: 'normal' }}
                    disabled={submitting}
                  />

                  <div className="flex items-center space-x-2.5">
                    <button
                      onClick={triggerParser}
                      className="inline-flex items-center space-x-2 bg-slate-950 hover:bg-slate-900 border-l-2 border-teal-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
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

              {/* Parsed Preview Panel */}
              <div className="space-y-4">
                {isParsed ? (
                  <div className="bg-white p-6 rounded-3xl border border-teal-150 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-850">Pratinjau Hasil Pembacaan</h4>
                        <p className="text-[10.5px] text-emerald-600 font-bold mt-1">Ditemukan {parsedData.length} grup kunjungan pasien rawat inap</p>
                      </div>
                      <span className="h-10 w-10 text-emerald-600 bg-emerald-50 rounded-full flex items-center justify-center font-black text-xs">
                        {parsedData.length}
                      </span>
                    </div>

                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                      {parsedData.map((p, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-sans space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold tracking-wide text-slate-800 text-xs block uppercase">{p.nama_pasien}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Reg: {p.no_registrasi} • RM Code: #{p.no_rm}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-400 font-medium">{p.tanggal_pelayanan}</span>
                              <select 
                                className="text-[10px] font-bold border rounded-lg p-1 bg-white focus:ring-1 focus:ring-teal-500 outline-none"
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

                          {/* Extra Inputs: Room/Kamar Bed Code, ICD-10 admission/discharge */}
                          <div className="grid grid-cols-4 gap-2 border-t border-slate-200/40 pt-2 text-[10px]">
                            <div>
                              <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">DPJP</label>
                              <input
                                type="text"
                                className="mt-1 w-full p-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                                value={p.dpjp || ''}
                                placeholder="Nama Dokter"
                                onChange={(e) => {
                                  const newData = [...parsedData];
                                  newData[idx].dpjp = e.target.value;
                                  setParsedData(newData);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">Kamar Bed</label>
                              <select
                                className="mt-1 w-full p-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium outline-none"
                                value={p.kamar || 'Kamar Sinta'}
                                onChange={(e) => {
                                  const newData = [...parsedData];
                                  newData[idx].kamar = e.target.value;
                                  setParsedData(newData);
                                }}
                              >
                                <option value="Kamar Sinta">Kamar Sinta</option>
                                <option value="Kamar Rama">Kamar Rama</option>
                                <option value="Kamar Yudistira">Kamar Yudistira</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">Diagnosa Masuk (ICD)</label>
                              <select
                                className="mt-1 w-full p-1 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none"
                                value={p.icd_masuk || ''}
                                onChange={(e) => {
                                  const newData = [...parsedData];
                                  newData[idx].icd_masuk = e.target.value;
                                  setParsedData(newData);
                                }}
                              >
                                <option value="">- Pilih ICD -</option>
                                {icdList.map((icd, i) => (
                                  <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider">Diagnosa Pulang (ICD)</label>
                              <select
                                className="mt-1 w-full p-1 bg-white border border-slate-200 rounded-lg text-slate-700 outline-none"
                                value={p.icd_pulang || ''}
                                onChange={(e) => {
                                  const newData = [...parsedData];
                                  newData[idx].icd_pulang = e.target.value;
                                  setParsedData(newData);
                                }}
                              >
                                <option value="">- Pilih ICD -</option>
                                {icdList.map((icd, i) => (
                                  <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Action list summary summary */}
                          <div className="border-t border-slate-200/50 pt-2 space-y-1 text-[10px] font-semibold text-slate-655">
                            {p.tindakan.map((t: any, tIdx: number) => (
                              <div key={tIdx} className="flex justify-between">
                                <span className="truncate max-w-[15rem]">• {t.tindakan_nama}</span>
                                <span className="font-mono text-slate-400">x{t.jumlah || 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        onClick={handleBulkInsert}
                        className="inline-flex items-center justify-center w-full space-x-2 bg-teal-600 hover:bg-teal-550 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-teal-500/10 cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Menyimpan ke Database...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Simpan Seluruh Kunjungan ke Database</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-72 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl border border-slate-200/70 border-dashed flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Layers strokeWidth={1} className="h-10 w-10 mb-2 text-slate-300" />
                    <span className="text-xs font-bold uppercase tracking-widest block">Aesthetic Layout Stage Preview</span>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-1">Lakukan pemrosesan teks di panel sebelah kiri untuk menampilkan pratinjau hasil penataan kolom pasien secara otomatis.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: MANUAL INSCRIPTION / EDIT SHEET FORM */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">Formulir Rawat Inap (Ranap)</h3>
                  <p className="text-xs text-slate-400 font-medium">{isEditMode ? 'Ubah rincian resep pelayanan inap' : 'Daftarkan rujukan pelayanan inap baru secara manual'}</p>
                </div>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitManual} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-650">
                {/* 1. Kunjungan Level Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">No. Registrasi (Auto-Generate)</label>
                    <input
                      type="text"
                      required
                      readOnly
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-none"
                      value={noRegistrasi}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Kamar Bed Inap</label>
                    <select
                      required
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      value={kamar}
                      onChange={(e) => setKamar(e.target.value)}
                    >
                      <option value="Kamar Sinta">Kamar Sinta</option>
                      <option value="Kamar Rama">Kamar Rama</option>
                      <option value="Kamar Yudistira">Kamar Yudistira</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">No. Rekam Medis (RM)</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 002462"
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl font-mono focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      value={noRm}
                      onChange={(e) => setNoRm(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nama Pasien</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: INDAH SARASWATI"
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl uppercase focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      value={namaPasien}
                      onChange={(e) => setNamaPasien(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Pelayanan Masuk</label>
                    <input
                      type="date"
                      required
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      value={tanggalPelayanan}
                      onChange={(e) => setTanggalPelayanan(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tingkatan Triase Kegawatan</label>
                    <select
                      value={triase}
                      onChange={(e) => setTriase(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                    >
                      <option value="hijau">Hijau - Non Darurat</option>
                      <option value="kuning">Kuning - Darurat</option>
                      <option value="merah">Merah - Gawat Darurat</option>
                      <option value="hitam">Hitam - Meninggal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">DPJP (Dokter Penanggung Jawab Pasien)</label>
                    <select
                      required
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      value={dpjp}
                      onChange={(e) => setDpjp(e.target.value)}
                    >
                      <option value="">-- Pilih Dokter --</option>
                      {dokterList.map(d => (
                        <option key={d.id} value={d.nama_dokter}>{d.nama_dokter}</option>
                      ))}
                    </select>
                  </div>

                  {/* DOUBLE DIAGNOSIS INPUT COLS */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Diagnosa Masuk (ICD-10)</label>
                    <select
                      value={icdMasuk}
                      onChange={(e) => setIcdMasuk(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                    >
                      <option value="">- Pilih Diagnosa Masuk -</option>
                      {icdList.map((icd, i) => (
                        <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Diagnosa Pulang (ICD-10)</label>
                    <select
                      value={icdPulang}
                      onChange={(e) => setIcdPulang(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                    >
                      <option value="">- Pilih Diagnosa Pulang -</option>
                      {icdList.map((icd, i) => (
                        <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Tindakan Detail Child List row loop */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black uppercase text-teal-600 tracking-wide">Rincian Tindakan Pelayanan Bed</h4>
                    <button
                      type="button"
                      onClick={addTindakanField}
                      className="inline-flex items-center space-x-1 text-teal-600 hover:text-teal-700 font-extrabold uppercase text-xs cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Tambah Tindakan</span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {manualTindakan.map((t, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col space-y-3 relative font-sans">
                        {manualTindakan.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTindakanField(idx)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded font-black uppercase w-max tracking-wider">
                          Tindakan Medis #{idx + 1}
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 font-extrabold uppercase tracking-wider">Nama Layanan / Tindakan</label>
                            <input
                              type="text"
                              required
                              placeholder="Masukkan nama tindakan"
                              className="mt-1.5 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              value={t.tindakan_nama}
                              onChange={(e) => updateTindakanField(idx, 'tindakan_nama', e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-500 font-extrabold uppercase tracking-wider">Jumlah (Qty)</label>
                            <input
                              type="number"
                              required
                              className="mt-1.5 w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none font-mono"
                              value={t.jumlah}
                              onChange={(e) => updateTindakanField(idx, 'jumlah', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit actions row */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsManualModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-550 border-l border-teal-750 text-white font-extrabold rounded-xl shadow-md cursor-pointer transition-all"
                    disabled={submitting}
                  >
                    {submitting ? 'Menyimpan...' : (isEditMode ? 'Simpan Rincian' : 'Simpan Kunjungan')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
