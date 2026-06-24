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
import { ICD10, TIPE_UNIT_RAWAT_JALAN } from '../../types.js';

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

interface OutpatientRecord {
  id: number;
  no_registrasi: string;
  no_rm: string;
  nama_pasien: string;
  tanggal_pelayanan: string;
  tindakan: Tindakan[];
  created_at?: string;
  triase?: string;
  dpjp: string;
}

const COLORS = ['#0d9488', '#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#10b981'];

const formatTanggalIndo = (tanggalStr: string) => {
  if (!tanggalStr) return '-';
  try {
    const rawDate = tanggalStr.includes('T') ? tanggalStr.split('T')[0] : tanggalStr;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const d = new Date(tanggalStr);
    if (!isNaN(d.getTime())) {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    console.warn('Gagal memformat tanggal:', e);
  }
  return tanggalStr;
};

const formatJamIndo = (jamStr: string) => {
  if (!jamStr) return '-';
  const parts = jamStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return jamStr;
};

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
  const [unit, setUnit] = useState('Poli Umum');
  const [unitFilter, setUnitFilter] = useState('all');
  const [dpjp, setDpjp] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [procedureFilter, setProcedureFilter] = useState<string | null>(null);
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [dokterList, setDokterList] = useState<any[]>([]);
  const [icdKode, setIcdKode] = useState('');
  const [bulkUnit, setBulkUnit] = useState('');
  const [manualTindakan, setManualTindakan] = useState<Tindakan[]>([
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

  // Bulk importer states
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Duplicate Check States
  const [duplicateMap, setDuplicateMap] = useState<{[key: string]: any}>({});
  const [checkingBulkDuplicate, setCheckingBulkDuplicate] = useState(false);
  const [manualDuplicateData, setManualDuplicateData] = useState<any>(null);
  const [checkingManualDuplicate, setCheckingManualDuplicate] = useState(false);

  // Load records
  const fetchRecords = async (start = startDate, end = endDate) => {
    setLoading(true);
    try {
      const res = await api.get('/pelayanan/rawat-jalan', { params: { startDate: start, endDate: end } });
      const sorted = (res.data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.tanggal_pelayanan).getTime();
        const dateB = new Date(b.tanggal_pelayanan).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setRecords(sorted);
    } catch (err: any) {
      console.error('Gagal memuat rekap pelayanan', err);
      showFeedback('error', 'Gagal memuat database pelayanan rawat jalan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchIcd = async () => {
      try {
        const res = await api.get('/pelayanan/icd10');
        setIcdList(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchDokter = async () => {
      try {
        const res = await api.get('/dokter');
        setDokterList(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchIcd();
    fetchDokter();
    fetchRecords(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    if (!noRegistrasi || isEditMode) {
      setManualDuplicateData(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setCheckingManualDuplicate(true);
      try {
        const res = await api.get('/pelayanan/check-duplicate', { params: { no_registrasi: noRegistrasi } });
        if (res.data && res.data.exists) {
          setManualDuplicateData(res.data);
        } else {
          setManualDuplicateData(null);
        }
      } catch (err) {
        console.error('Error checking duplicate:', err);
        setManualDuplicateData(null);
      } finally {
        setCheckingManualDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [noRegistrasi, isEditMode]);

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
    if (!noRegistrasi || !noRm || !namaPasien || !tanggalPelayanan || !unit) {
      showFeedback('error', 'Mohon isi semua data demografi pasien, termasuk unit pelayanan.');
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
          unit: unit,
          icd_kode: icdKode,
          dpjp: dpjp,
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
          unit: unit,
          icd_kode: icdKode,
          dpjp: dpjp,
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
    setUnit('Poli Umum');
    setIcdKode('');
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
    setIsEditMode(false);
    setEditTargetId(null);
    setIsManualModalOpen(false);
  };

  const handleEditClick = (rec: any) => {
    setNoRegistrasi(rec.no_registrasi);
    setNoRm(rec.no_rm);
    setNamaPasien(rec.nama_pasien);
    setTanggalPelayanan(rec.tanggal_pelayanan);
    setTriase(rec.triase || 'hijau');
    setUnit(rec.unit || 'Poli Umum');
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

    // Indonesian month helper
    const parseIndoDate = (dateStr: string) => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      const cleaned = dateStr.trim().toLowerCase();
      
      // Try simple DD-MM-YYYY or YYYY-MM-DD
      if (cleaned.includes('-') || cleaned.includes('/')) {
        const parts = cleaned.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            // DD-MM-YYYY
            const d = parts[0].padStart(2, '0');
            const m = parts[1].padStart(2, '0');
            const y = parts[2];
            return `${y}-${m}-${d}`;
          } else if (parts[0].length === 4) {
            // YYYY-MM-DD
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }

      const months: { [key: string]: string } = {
        januari: '01', pebruari: '02', febuari: '02', februari: '02', maret: '03',
        april: '04', mei: '05', juni: '06', juli: '07', agustus: '08',
        september: '09', oktober: '10', nopember: '11', november: '11', desember: '12',
        jan: '01', feb: '02', mar: '03', apr: '04', mei_short: '05', jun: '06',
        jul: '07', agu: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12'
      };

      const parts = cleaned.split(/\s+/);
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const monthWord = parts[1];
        const year = parts[2];
        const monthNum = months[monthWord] || '01';
        return `${year}-${monthNum}-${day}`;
      }

      return dateStr.trim() || new Date().toISOString().split('T')[0];
    };

    const matchUnit = (unitStr: string): string | null => {
      if (!unitStr) return null;
      const cleaned = unitStr.toUpperCase().trim();
      
      // Direct substring or match lookup in TIPE_UNIT_RAWAT_JALAN
      const found = TIPE_UNIT_RAWAT_JALAN.find(u => 
        u.toUpperCase() === cleaned ||
        u.toUpperCase().includes(cleaned) || 
        cleaned.includes(u.toUpperCase()) ||
        u.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(cleaned.replace(/[^A-Z0-9]/g, '')) ||
        cleaned.replace(/[^A-Z0-9]/g, '').includes(u.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      );

      if (found) return found;

      // Common Indonesian aliases mapping
      if (cleaned.includes('POLI UMUM') || cleaned === 'UMUM') return 'PL003 (POLI UMUM)';
      if (cleaned.includes('POLI KIA') || cleaned.includes('POLI ANAK') || cleaned === 'KIA' || cleaned === 'ANAK') return 'PL001 (POLI KIA)';
      if (cleaned.includes('POLI THT') || cleaned === 'THT') return 'PL002 (POLI THT)';
      if (cleaned.includes('POLI OBGYN') || cleaned.includes('KANDUNGAN') || cleaned === 'OBGYN') return 'PL006 (POLI OBGYN)';
      if (cleaned.includes('POLI MATA') || cleaned === 'MATA') return 'MT (POLI MATA)';
      if (cleaned.includes('POLI PENYAKIT DALAM') || cleaned === 'DALAM' || cleaned.includes('INTERNA')) return 'PPD (POLI PENYAKIT DALAM)';
      if (cleaned.includes('POLI PARU') || cleaned === 'PARU') return 'PR (POLI PARU)';
      if (cleaned.includes('POLI GIGI') || cleaned.includes('GIGI DAN MULUT')) return 'GGM (POLI GIGI DAN MULUT)';
      if (cleaned.includes('FISIOTERAPI') || cleaned.includes('REHABILITASI')) return 'PL004 (POLI FISIOTERAPI)';
      if (cleaned.includes('SARAF') || cleaned.includes('NEUROLOGI')) return 'SARAF (POLI SARAF)';
      if (cleaned.includes('JANTUNG') || cleaned.includes('KARDIO')) return 'JPD (POLI JANTUNG DAN PEMBULUH DARAH)';
      if (cleaned.includes('UROLOGI')) return 'URO (POLI UROLOGI)';
      if (cleaned.includes('BEDAH UMUM')) return 'BU (POLI BEDAH UMUM)';
      if (cleaned.includes('ORTOPEDI')) return 'ORT (POLI ORTOPEDI)';
      if (cleaned.includes('HOMECARE') || cleaned.includes('HC')) return 'HC (HOMECARE)';
      if (cleaned.includes('IGD')) return 'IGD';
      if (cleaned.includes('RAWAT INAP') || cleaned.includes('RANAP') || cleaned.includes('IRI')) return 'IRI (RAWAT INAP)';
      if (cleaned.includes('LABORATORIUM') || cleaned.includes('LAB')) return 'LABORATORIUM';
      
      return null;
    };

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
      if (
        cols[0]?.toLowerCase().includes('no') && 
        (cols[1]?.toLowerCase().includes('pendaftaran') || cols[1]?.toLowerCase().includes('registrasi') || cols[1]?.toLowerCase().includes('reg'))
      ) {
        headerSkipped = true;
        continue;
      }

      if (cols.length < 6) {
        continue; // incomplete line schema
      }

      // Populate elements dynamically based on columns count
      let noReg = "";
      let noRmCode = "";
      let pName = "";
      let exec = "Petugas Medis";
      let tName = "";
      let tKet = "";
      let tTgl = "";
      let tJam = "08:00:00";
      let tTarif = 0;
      let tSarana = 0;
      let tPel = 0;
      let tMedis = 0;
      let qty = 1;
      let tglLahir = "";
      let jk = "";
      let alamat = "";
      let kelurahan = "";
      let kecamatan = "";
      let kota = "";
      let parsedUnit: string | null = null;

      const cleanNum = (str: string) => {
        if (!str) return 0;
        const stripped = str.replace(/[^\d]/g, '');
        return Number(stripped) || 0;
      };

      if (cols.length >= 15) {
        // New standard 16-columns format
        noReg = cols[1];
        noRmCode = cols[2];
        pName = cols[3];
        tglLahir = cols[4];
        jk = cols[6];
        alamat = cols[7];
        kelurahan = cols[8];
        kecamatan = cols[9];
        kota = cols[10];
        tName = cols[11]; // Nama Tindakan
        tTgl = cols[12] || ''; // Tanggal MRS
        parsedUnit = matchUnit(cols[14]); // Unit
        qty = cols[15] ? cleanNum(cols[15]) || 1 : 1;
        tKet = [
          cols[7] ? `Alamat: ${cols[7]}` : '',
          cols[5] ? `Umur: ${cols[5]}` : '',
          cols[6] ? `JK: ${cols[6]}` : ''
        ].filter(Boolean).join(' • ');
      } else {
        // Old format mapping
        noReg = cols[1];
        noRmCode = cols[2];
        pName = cols[3];
        exec = cols[4];
        tName = cols[5];
        tKet = cols[6] || '';
        tTgl = cols[7] || '';
        tJam = cols[8] || '08:00:00';

        tTarif = cleanNum(cols[9]);
        tSarana = cleanNum(cols[10]);
        tPel = cleanNum(cols[11]);
        tMedis = cleanNum(cols[12]);
        qty = cleanNum(cols[13]) || 1;
      }

      const formattedDate = parseIndoDate(tTgl);

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
          subtotal: 0,
          unit: parsedUnit,
          tanggal_lahir: tglLahir,
          jenis_kelamin: jk,
          alamat: alamat,
          kelurahan: kelurahan,
          kecamatan: kecamatan,
          kota: kota
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
          unit: act.unit,
          tindakan: [],
          tanggal_lahir: act.tanggal_lahir,
          jenis_kelamin: act.jenis_kelamin,
          alamat: act.alamat,
          kelurahan: act.kelurahan,
          kecamatan: act.kecamatan,
          kota: act.kota
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
    setDuplicateMap({});

    // Dynamic Bulk Duplicate Checker
    const checkDuplicates = async () => {
      setCheckingBulkDuplicate(true);
      try {
        const list = output.map(x => x.no_registrasi).filter(Boolean);
        if (list.length > 0) {
          const res = await api.post('/pelayanan/check-duplicates-bulk', { no_registrasi_list: list });
          if (res.data && res.data.duplicates) {
            setDuplicateMap(res.data.duplicates);
          }
        }
      } catch (err) {
        console.error('Gagal memeriksa duplikat massal:', err);
      } finally {
        setCheckingBulkDuplicate(false);
      }
    };
    checkDuplicates();

    showFeedback('success', `Berhasil mengurai ${output.length} registrasi kunjungan unik.`);
  };

  const handleBulkInsert = async () => {
    if (parsedData.length === 0) return;
    const allHaveUnit = parsedData.every(p => p.unit);
    if (!bulkUnit && !allHaveUnit) {
      showFeedback('error', 'Silakan pilih unit pelayanan terlebih dahulu sebelum menyimpan.');
      return;
    }
    setSubmitting(true);
    let successCount = 0;

    try {
      for (const p of parsedData) {
        await api.post('/pelayanan/rawat-jalan', {
          no_registrasi: p.no_registrasi,
          no_rm: p.no_rm,
          nama_pasien: p.nama_pasien,
          tanggal_pelayanan: p.tanggal_pelayanan,
          triase: p.triase || 'hijau',
          unit: p.unit || bulkUnit,
          icd_kode: p.icd_kode || null,
          dpjp: p.dpjp || null,
          tindakan: p.tindakan,
          tanggal_lahir: p.tanggal_lahir,
          jenis_kelamin: p.jenis_kelamin,
          alamat: p.alamat,
          kelurahan: p.kelurahan,
          kecamatan: p.kecamatan,
          kota: p.kota
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
  }, [searchQuery, triageFilter, unitFilter, procedureFilter, startDate, endDate]);

  // Filtered lists for rendering search query and triage
  const filteredRecords = (Array.isArray(records) ? records : []).filter(rec => {
    const q = searchQuery.toLowerCase();
    const matchesTriage = triageFilter === 'all' || String(rec.triase || 'hijau').toLowerCase() === triageFilter;
    const matchesUnit = unitFilter === 'all' || (rec.unit || 'Poli Umum') === unitFilter;
    const matchesProcedure = !procedureFilter || rec.tindakan.some(t => t.tindakan_nama === procedureFilter);
    const matchesSearch = (
      (rec.nama_pasien || '').toLowerCase().includes(q) ||
      (rec.no_registrasi || '').toLowerCase().includes(q) ||
      (rec.no_rm || '').toLowerCase().includes(q) ||
      rec.tindakan.some((t: any) => 
        (t.tindakan_nama || '').toLowerCase().includes(q) || 
        (t.pelaksana || '').toLowerCase().includes(q)
      )
    );
    return matchesTriage && matchesUnit && matchesProcedure && matchesSearch;
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 }
  };

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
  const dpjpMap: { [key: string]: number } = {};
  const dateMap: { [key: string]: { kunjungan: number; pendapatan: number } } = {};

  safeRecords.forEach(r => {
    const dStr = r.tanggal_pelayanan;
    if (!dateMap[dStr]) dateMap[dStr] = { kunjungan: 0, pendapatan: 0 };
    dateMap[dStr].kunjungan += 1;

    if (r.dpjp) {
      dpjpMap[r.dpjp] = (dpjpMap[r.dpjp] || 0) + 1;
    }

    r.tindakan.forEach(t => {
      procedureMap[t.tindakan_nama] = (procedureMap[t.tindakan_nama] || 0) + 1;
      dateMap[dStr].pendapatan += t.subtotal;
    });
  });

  // Most Active Clinic Performer
  let topDPJP = '-';
  let topDPJPCount = 0;
  Object.entries(dpjpMap).forEach(([name, count]) => {
    if (count > topDPJPCount) {
      topDPJP = name;
      topDPJPCount = count;
    }
  });

  // Top 5 treatments for chart
  const chartTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // All treatments for display
  const allTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Daily Trend Charts Data
  const chartTrendData = Object.entries(dateMap)
    .map(([tanggal, data]) => ({
      tanggal: new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      kunjungan: data.kunjungan,
      pendapatan: data.pendapatan / 1000 // in thousands Rp for better readability
    }))
    .sort((a,b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .slice(0, 10);

  // 10 Diagnosa Terbanyak (ICD-10)
  const icdCountMap: { [key: string]: number } = {};
  safeRecords.forEach(r => {
    if (r.icd_kode) {
      icdCountMap[r.icd_kode] = (icdCountMap[r.icd_kode] || 0) + 1;
    }
  });

  const top10Diagnosa = Object.entries(icdCountMap)
    .map(([kode, count]) => {
      const matchingIcd = icdList.find((item) => item.kode_icd === kode);
      return {
        kode,
        deskripsi: matchingIcd ? matchingIcd.deskripsi : 'Deskripsi Tidak Diketahui',
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Upper Module Heading */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-200 gap-4">
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
      </motion.div>

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

      {/* MAIN CONTENT AREA */}
      <div className="min-h-[400px]">
        {loading ? (
          <AnimatePresence mode="wait">
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-teal-600" />
              <p className="text-slate-400 font-mono text-xs mt-4">Mengakses data server rawat jalan...</p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="space-y-6">
            {/* TAB CONTENT SWITCHER */}
            <AnimatePresence mode="wait">
              {activeTab === 'statistik' && (
                <div className="space-y-6">
                  {/* Core metrics bento boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* 1. Kunjungan Pasien */}
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
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
                        <p className="text-xxs font-normal text-slate-500 mt-1">Total Kunjungan Pasien Rawat Jalan</p>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                    </div>

                    {/* 2. Tindakan Medis */}
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
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
                    </div>

                    {/* 4. DPJP Teraktif */}
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.01] hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                          <TrendingUp className="h-6 w-6 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-mono font-medium bg-amber-100/80 text-amber-850 px-2.5 py-0.5 rounded-full">
                          DPJP
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight font-display truncate leading-tight uppercase">
                          {topDPJP}
                        </h3>
                        <p className="text-xxs font-mono text-amber-600 font-bold mt-1">
                          {topDPJPCount} Kunjungan
                        </p>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
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

                      {/* Additional Procedures Filter Section */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="text-xs font-bold text-slate-750 uppercase tracking-wider">Daftar Semua Tindakan ({allTreatmentData.length})</h4>
                          {procedureFilter && (
                            <button 
                              onClick={() => setProcedureFilter(null)}
                              className="text-[10px] text-teal-600 hover:text-teal-700 font-extrabold uppercase tracking-wide cursor-pointer"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {allTreatmentData.map((item, idx) => (
                             <div 
                               key={idx} 
                               className={`p-2.5 rounded-xl cursor-pointer text-xs flex justify-between items-center transition-all border ${procedureFilter === item.name ? 'bg-teal-50 border-teal-200 text-teal-900 font-bold' : 'bg-slate-50/50 hover:bg-slate-100 border-slate-150/40 text-slate-700 hover:text-slate-900'}`}
                               onClick={() => setProcedureFilter(procedureFilter === item.name ? null : item.name)}
                             >
                               <span className="truncate pr-1.5">{item.name}</span>
                               <span className="font-extrabold text-[11px] text-slate-800 bg-white border border-slate-200 shadow-3xs px-2 py-0.5 rounded-lg shrink-0">
                                 {item.count}
                               </span>
                             </div>
                          ))}
                        </div>
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
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                        {chartTreatmentData.map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`flex items-center justify-between text-[11px] font-medium text-slate-650 cursor-pointer p-1 rounded-md transition-colors ${procedureFilter === item.name ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'}`}
                            onClick={() => setProcedureFilter(procedureFilter === item.name ? item.name : null)}
                          >
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

                  {/* TOP 10 DIAGNOSA ICD-10 TERBANYAK */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display flex items-center gap-2">
                          <Heart className="h-4.5 w-4.5 text-rose-500 fill-rose-100" />
                          <span>10 Diagnosa Terbanyak (ICD-10)</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Daftar klasifikasi diagnosa rekam medis rawat jalan dengan kunjungan terbanyak</p>
                      </div>
                      <span className="text-[10px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto shrink-0">
                        Kunjungan Terbanyak
                      </span>
                    </div>

                    {top10Diagnosa.length === 0 ? (
                      <div className="text-center py-10 text-slate-350 text-xs font-mono border border-dashed border-slate-200 rounded-2xl">
                        Belum ada diagnosa (ICD-10) tercatat pada rekam medis kunjungan
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {top10Diagnosa.map((item, index) => {
                          const percentage = totalVisits > 0 ? Math.round((item.count / totalVisits) * 100) : 0;
                          return (
                            <div key={item.kode} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100/80 transition flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <span className="text-xs font-bold text-slate-400 w-5 shrink-0 text-center font-mono">
                                  #{index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                      {item.kode}
                                    </span>
                                    <span className="font-bold text-xs text-slate-800 truncate" title={`${item.kode} - ${item.deskripsi}`}>
                                      {item.deskripsi}
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200/60 rounded-full h-1 mt-2 overflow-hidden max-w-[180px]">
                                    <div 
                                      className="bg-rose-500 h-1 rounded-full" 
                                      style={{ width: `${Math.max(percentage, 5)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <span className="text-xs font-black text-slate-800 font-mono">
                                  {item.count}
                                </span>
                                <span className="text-[9px] text-slate-450 font-bold block uppercase tracking-wider">
                                  Kunjungan ({percentage}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                        onClick={() => setActiveTab('input')} 
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
                <motion.div 
                  key="visits"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
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
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari..."
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

                <div className="relative">
                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="pl-4 pr-8 py-2.5 bg-white border border-slate-250 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/25 transition-all"
                  >
                    <option value="all">Semua Unit</option>
                    {TIPE_UNIT_RAWAT_JALAN.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
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
                          <th className="px-6 py-4.5">Unit Pelayanan</th>
                          <th className="px-6 py-4.5">DPJP</th>
                          <th className="px-6 py-4.5">Tanggal Kunjungan</th>
                          <th className="px-6 py-4.5 text-center">Jumlah Tindakan</th>
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
                                <td className="px-6 py-4.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    {rec.unit || 'Poli Umum'}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5">
                                  <span className="text-[11px] font-medium text-slate-700">
                                    {rec.dpjp || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5 font-normal text-slate-650">
                                  {new Date(rec.tanggal_pelayanan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4.5 text-center">
                                  <span className="inline-flex items-center px-2.5 py-1 text-xxs font-semibold bg-teal-50 border border-teal-150 text-teal-700 rounded-lg">
                                    {rec.tindakan.length} Tindakan
                                  </span>
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
                                  <td colSpan={7} className="px-6 py-4.5 border-t border-b border-slate-150">
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
                                                <span>{formatTanggalIndo(t.tindakan_tanggal)} pukul {formatJamIndo(t.tindakan_jam)}</span>
                                              </p>
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
            </motion.div>
          )}

              {/* TAB 3: PASTE TEXT BULK IMPORTER */}
              {activeTab === 'input' && (
                <motion.div 
                  key="input"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
                >
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
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-sans space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className="font-extrabold tracking-wide text-slate-800 text-xs uppercase block">{p.nama_pasien}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Reg: {p.no_registrasi} • RM: #{p.no_rm}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{p.tanggal_pelayanan}</span>
                          </div>

                          {duplicateMap[p.no_registrasi] ? (
                            <div className="bg-amber-50 text-amber-800 text-[10px] sm:text-xs p-2.5 rounded-xl border border-amber-200/80 flex items-start space-x-2 font-sans mt-1">
                              <span className="text-xs mt-0.5">⚠️</span>
                              <span>
                                <strong>Kunjungan Duplikat ({duplicateMap[p.no_registrasi].modul})</strong>: Terdaftar atas nama <strong>{duplicateMap[p.no_registrasi].nama_pasien}</strong> ({duplicateMap[p.no_registrasi].tanggal_pelayanan}). Menyimpan akan <strong>memperbarui (update)</strong> tindakan.
                              </span>
                            </div>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs p-2.5 rounded-xl border border-emerald-150 flex items-start space-x-2 font-sans mt-1">
                              <span className="text-xs mt-0.5">🆕</span>
                              <span>Registrasi Baru: Data belum terdaftar di sistem. Akan disimpan sebagai rekam kunjungan baru.</span>
                            </div>
                          )}

                          {/* Controls Grid */}
                          <div className="bg-white border border-slate-150 p-3 rounded-xl">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Triase</label>
                                <select 
                                  className="text-[10px] font-bold border border-slate-200 rounded-lg p-1 w-full bg-white text-slate-800"
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

                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Diagnosa (ICD-10)</label>
                                <select 
                                  className="text-[10px] font-bold border border-slate-200 rounded-lg p-1 w-full bg-white text-slate-800"
                                  value={p.icd_kode || ''}
                                  onChange={(e) => {
                                    const newData = [...parsedData];
                                    newData[idx].icd_kode = e.target.value;
                                    setParsedData(newData);
                                  }}
                                >
                                  <option value="">-- Diagnosa ICD-10 --</option>
                                  {icdList.map(icd => (
                                    <option key={icd.id} value={icd.kode_icd}>
                                      {icd.kode_icd} - {icd.deskripsi}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">DPJP</label>
                                <select
                                  className="text-[10px] font-bold border border-slate-200 rounded-lg p-1 w-full bg-white text-slate-800"
                                  value={p.dpjp || ''}
                                  onChange={(e) => {
                                    const newData = [...parsedData];
                                    newData[idx].dpjp = e.target.value;
                                    setParsedData(newData);
                                  }}
                                >
                                  <option value="">-- DPJP --</option>
                                  {dokterList.map(d => (
                                    <option key={d.id} value={d.nama_dokter}>{d.nama_dokter}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Action list summary */}
                          <div className="border-t border-slate-200/50 pt-2 space-y-1 text-[10px] font-semibold text-slate-600">
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

                    <div className="pt-4 border-t border-slate-100">
                      <div className="mb-4">
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Unit Pelayanan (Wajib Pilih)</label>
                        <select
                          value={bulkUnit}
                          onChange={(e) => setBulkUnit(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="" disabled>-- Pilih Unit --</option>
                          {TIPE_UNIT_RAWAT_JALAN.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleBulkInsert}
                        className="flex-1 inline-flex items-center justify-center w-full space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-teal-700/10 cursor-pointer"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )}
  </div>

      {/* MANUAL CRUD REGISTRATION & CORRECTION MODAL */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Modal Header */}
                <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">
                      {isEditMode ? 'Formulir Koreksi Rawat Jalan (Rajal)' : 'Formulir Registrasi Rawat Jalan (Rajal)'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Input detail data kunjungan beserta rincian tarif tindakan secara manual</p>
                  </div>
                  <button
                    onClick={resetManualForm}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Form Scrollable Wrapper */}
                <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-650">
                  {/* Section A: Demography */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black uppercase text-teal-600 tracking-wide">Identitas & Demutasi Kunjungan</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">No. Registrasi</label>
                        <input
                          type="text"
                          placeholder="Contoh: RJ16062026-00001"
                          value={noRegistrasi}
                          onChange={(e) => setNoRegistrasi(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          disabled={isEditMode}
                          required
                        />
                        {checkingManualDuplicate && (
                          <p className="text-[10px] text-teal-600 mt-1 font-bold animate-pulse">Memeriksa nomor registrasi...</p>
                        )}
                        {!checkingManualDuplicate && manualDuplicateData && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] p-2.5 rounded-lg mt-1.5 font-sans space-y-0.5 leading-relaxed">
                            <p className="font-bold flex items-center text-amber-900">
                              <span className="mr-1">⚠️</span> Nomor Registrasi Sudah Terdaftar
                            </p>
                            <p>
                              Ditemukan di modul <strong>{manualDuplicateData.modul}</strong> atas nama <strong>{manualDuplicateData.nama_pasien}</strong> ({manualDuplicateData.tanggal_pelayanan}).
                            </p>
                            <p className="text-amber-700">
                              Menyimpan akan <strong>memperbarui (update)</strong> data kunjungan yang ada.
                            </p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">No. Rekam Medis (RM)</label>
                        <input
                          type="text"
                          placeholder="Contoh: 002502"
                          value={noRm}
                          onChange={(e) => setNoRm(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nama Pasien</label>
                        <input
                          type="text"
                          placeholder="Contoh: MADE YULIANA"
                          value={namaPasien}
                          onChange={(e) => setNamaPasien(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white uppercase"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Pelayanan</label>
                        <input
                          type="date"
                          value={tanggalPelayanan}
                          onChange={(e) => setTanggalPelayanan(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tingkatan Triase Kegawatan</label>
                        <select
                          value={triase}
                          onChange={(e) => setTriase(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="hijau">Hijau - Non Darurat</option>
                          <option value="kuning">Kuning - Darurat</option>
                          <option value="hitam">Hitam - Meninggal</option>
                          <option value="merah">Merah - Gawat Darurat</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Unit Pelayanan</label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="" disabled>-- Pilih Unit --</option>
                          {TIPE_UNIT_RAWAT_JALAN.map(unit => (
                              <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">DPJP (Dokter Penanggung Jawab Pasien)</label>
                        <select
                          value={dpjp}
                          onChange={(e) => setDpjp(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="">-- Pilih Dokter --</option>
                          {dokterList.map(d => (
                            <option key={d.id} value={d.nama_dokter}>{d.nama_dokter}</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Diagnosis (ICD-10)</label>
                        <select
                          value={icdKode}
                          onChange={(e) => setIcdKode(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="">-- Pilih Diagnosis --</option>
                          {icdList.map(icd => <option key={icd.id} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Actions list */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black uppercase text-teal-600 tracking-wide">Rincian Tindakan Pelayanan Bed</h4>
                      <button
                        type="button"
                        onClick={addManualTindakanRow}
                        className="inline-flex items-center space-x-1 text-teal-600 hover:text-teal-700 font-extrabold uppercase text-xs cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Tindakan</span>
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {manualTindakan.map((t, index) => (
                        <div key={index} className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex flex-col space-y-3 relative font-sans">
                          {/* Remove button */}
                          {manualTindakan.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManualTindakanRow(index)}
                              className="absolute top-2 right-2 text-slate-404 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Hapus tindakan ini"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded w-fit uppercase">
                            Tindakan #{index + 1}
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nama Layanan/Tindakan</label>
                              <input
                                type="text"
                                placeholder="Masukkan nama tindakan (e.g., Konsultasi Dokter)"
                                value={t.tindakan_nama}
                                onChange={(e) => {
                                  const updated = [...manualTindakan];
                                  updated[index].tindakan_nama = e.target.value;
                                  setManualTindakan(updated);
                                }}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Keterangan Tambahan</label>
                              <input
                                type="text"
                                placeholder="Opsional"
                                value={t.tindakan_keterangan}
                                onChange={(e) => {
                                  const updated = [...manualTindakan];
                                  updated[index].tindakan_keterangan = e.target.value;
                                  setManualTindakan(updated);
                                }}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Jumlah (QTY)</label>
                              <input
                                type="number"
                                value={t.jumlah}
                                onChange={(e) => updateTarifFields(index, 'jumlah', Number(e.target.value))}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-205 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                                min={1}
                                required
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
                          <span>{isEditMode ? 'Simpan Kunjungan' : 'Simpan Kunjungan'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
