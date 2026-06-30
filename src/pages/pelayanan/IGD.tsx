import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
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
  Activity, 
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

interface IgdRecord {
  id: number;
  no_registrasi: string;
  no_rm: string;
  nama_pasien: string;
  tanggal_pelayanan: string;
  tindakan: Tindakan[];
  created_at?: string;
  triase?: string;
  icd_kode?: string;
  dpjp: string;
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

export default function IGD() {
  const [records, setRecords] = useState<IgdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.post('/logs', {
      action_type: 'VIEW',
      module_name: 'IGD',
      description: 'Membuka modul pelayanan IGD (Instalasi Gawat Darurat)'
    }).catch(err => console.warn('Gagal mencatat log pembukaan halaman:', err));
  }, []);

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
  const [dpjp, setDpjp] = useState('');

  // New patient additional fields
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('L');
  const [alamat, setAlamat] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kota, setKota] = useState('');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [procedureFilter, setProcedureFilter] = useState<string | null>(null);
  const [icdList, setIcdList] = useState<ICD10[]>([]);
  const [dokterList, setDokterList] = useState<any[]>([]);
  const [icdKode, setIcdKode] = useState('');
  const [manualTindakan, setManualTindakan] = useState<Tindakan[]>([
    {
      tindakan_nama: '',
      tindakan_keterangan: '',
      tindakan_tanggal: new Date().toISOString().split('T')[0],
      tindakan_jam: new Date().toTimeString().split(' ')[0],
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
      const res = await api.get('/pelayanan/igd', { params: { startDate: start, endDate: end } });
      const sorted = (res.data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.tanggal_pelayanan).getTime();
        const dateB = new Date(b.tanggal_pelayanan).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      });
      setRecords(sorted);
    } catch (err: any) {
      console.error('Gagal memuat rekap pelayanan IGD', err);
      showFeedback('error', 'Gagal memuat database pelayanan IGD.');
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
        const res = await api.get('/dokter', { params: { all: 'true' } });
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
    if (isEditMode) {
      setIsNewPatient(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (!noRm || noRm.trim().length < 2) {
        setIsNewPatient(false);
        return;
      }
      try {
        const res = await api.get('/pasien', { params: { q: noRm.trim() } });
        const exactMatch = res.data.find(
          (p: any) => String(p.no_rm).toLowerCase() === noRm.trim().toLowerCase()
        );
        if (exactMatch) {
          setNamaPasien(exactMatch.nama);
          setIsNewPatient(false);
        } else {
          setIsNewPatient(true);
        }
      } catch (err) {
        console.warn('Gagal memeriksa data pasien:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [noRm, isEditMode]);

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
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  // Safe decimal string parser
  const parseCostStr = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = val.replace(/[^\d]/g, '');
    return Number(clean) || 0;
  };

  // Add/Remove Action fields in Manual Entry form
  const addManualTindakanRow = () => {
    setManualTindakan([
      ...manualTindakan,
      {
        tindakan_nama: '',
        tindakan_keterangan: '',
        tindakan_tanggal: new Date().toISOString().split('T')[0],
        tindakan_jam: new Date().toTimeString().split(' ')[0],
        tarif_tindakan: 0,
        tarif_sarana: 0,
        tarif_pelayanan: 0,
        tarif_medis: 0,
        jumlah: 1,
        subtotal: 0
      }
    ]);
  };

  const removeManualTindakanRow = (idx: number) => {
    if (manualTindakan.length === 1) return;
    setManualTindakan(manualTindakan.filter((_, i) => i !== idx));
  };

  const updateManualTindakanField = (idx: number, field: keyof Tindakan, val: any) => {
    const updated = [...manualTindakan];
    let typedVal = val;
    
    if (['tarif_tindakan', 'tarif_sarana', 'tarif_pelayanan', 'tarif_medis', 'jumlah', 'subtotal'].includes(field)) {
      typedVal = val === '' ? 0 : Number(val);
    }

    updated[idx] = {
      ...updated[idx],
      [field]: typedVal
    };

    // Calculate subtotal
    if (field === 'tarif_tindakan' || field === 'jumlah') {
      updated[idx].subtotal = updated[idx].tarif_tindakan * updated[idx].jumlah;
    } else if (field === 'tarif_sarana' || field === 'tarif_pelayanan' || field === 'tarif_medis') {
      const partsSum = (updated[idx].tarif_sarana || 0) + (updated[idx].tarif_pelayanan || 0) + (updated[idx].tarif_medis || 0);
      updated[idx].tarif_tindakan = partsSum;
      updated[idx].subtotal = partsSum * (updated[idx].jumlah || 1);
    }

    setManualTindakan(updated);
  };

  // Save manual single entry
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noRegistrasi || !noRm || !namaPasien || !tanggalPelayanan) {
      showFeedback('error', 'Mohon isi semua data demografi pasien.');
      return;
    }

    // Verify actions have name
    const invalidAction = manualTindakan.some(t => !t.tindakan_nama);
    if (invalidAction) {
      showFeedback('error', 'Setiap rincian tindakan wajib menyertakan Nama Tindakan.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && editTargetId) {
        await api.put(`/pelayanan/igd/${editTargetId}`, {
          no_rm: noRm,
          nama_pasien: namaPasien,
          tanggal_pelayanan: tanggalPelayanan,
          triase: triase,
          icd_kode: icdKode || null,
          dpjp: dpjp,
          tindakan: manualTindakan
        });
        showFeedback('success', `Data pendaftaran ${noRegistrasi} berhasil diperbarui.`);
      } else {
        await api.post('/pelayanan/igd', {
          no_registrasi: noRegistrasi,
          no_rm: noRm,
          nama_pasien: namaPasien,
          tanggal_pelayanan: tanggalPelayanan,
          triase: triase,
          icd_kode: icdKode || null,
          dpjp: dpjp,
          tindakan: manualTindakan,
          tanggal_lahir: isNewPatient ? tanggalLahir : undefined,
          jenis_kelamin: isNewPatient ? jenisKelamin : undefined,
          alamat: isNewPatient ? alamat : undefined,
          kelurahan: isNewPatient ? kelurahan : undefined,
          kecamatan: isNewPatient ? kecamatan : undefined,
          kota: isNewPatient ? kota : undefined
        });
        showFeedback('success', `Data pendaftaran ${noRegistrasi} berhasil disimpan ke database.`);
      }

      // Reset
      resetManualForm();
      fetchRecords();
      setIsManualModalOpen(false);
      setActiveTab('kunjungan');
    } catch (err: any) {
      console.error(err);
      showFeedback('error', err.response?.data?.message || 'Gagal menyimpan pendaftaran.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetManualForm = () => {
    setIsEditMode(false);
    setEditTargetId(null);
    setNoRegistrasi('');
    setNoRm('');
    setNamaPasien('');
    setTanggalPelayanan(new Date().toISOString().split('T')[0]);
    setTriase('hijau');
    setIcdKode('');
    setDpjp('');
    setIsNewPatient(false);
    setTanggalLahir('');
    setJenisKelamin('L');
    setAlamat('');
    setKelurahan('');
    setKecamatan('');
    setKota('');
    setManualTindakan([
      {
        tindakan_nama: '',
        tindakan_keterangan: '',
        tindakan_tanggal: new Date().toISOString().split('T')[0],
        tindakan_jam: new Date().toTimeString().split(' ')[0],
        tarif_tindakan: 0,
        tarif_sarana: 0,
        tarif_pelayanan: 0,
        tarif_medis: 0,
        jumlah: 1,
        subtotal: 0
      }
    ]);
    setIsManualModalOpen(false);
  };

  const handleEditClick = (rec: IgdRecord) => {
    setIsEditMode(true);
    setEditTargetId(rec.id);
    setNoRegistrasi(rec.no_registrasi);
    setNoRm(rec.no_rm);
    setNamaPasien(rec.nama_pasien);
    
    // Ensure the date is clean YYYY-MM-DD format for <input type="date">
    const cleanDate = rec.tanggal_pelayanan && rec.tanggal_pelayanan.includes('T')
      ? rec.tanggal_pelayanan.split('T')[0]
      : (rec.tanggal_pelayanan || '');
    setTanggalPelayanan(cleanDate);

    setTriase(rec.triase || 'hijau');
    setIcdKode(rec.icd_kode || '');
    setDpjp(rec.dpjp || '');
    
    if (rec.tindakan && rec.tindakan.length > 0) {
      setManualTindakan(rec.tindakan.map(t => ({
        ...t,
        tindakan_tanggal: t.tindakan_tanggal || rec.tanggal_pelayanan,
        tindakan_jam: t.tindakan_jam || '08:00:00'
      })));
    } else {
      setManualTindakan([
        {
          tindakan_nama: '',
          tindakan_keterangan: '',
          tindakan_tanggal: rec.tanggal_pelayanan,
          tindakan_jam: '08:00:00',
          tarif_tindakan: 0,
          tarif_sarana: 0,
          tarif_pelayanan: 0,
          tarif_medis: 0,
          jumlah: 1,
          subtotal: 0
        }
      ]);
    }
    setIsManualModalOpen(true);
  };

  const handleDeleteRecord = async (id: number) => {
    Swal.fire({
      title: 'Hapus Kunjungan IGD?',
      text: 'Apakah Anda yakin ingin menghapus permanen data kunjungan IGD ini beserta riwayat tindakannya?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/pelayanan/igd/${id}`);
          showFeedback('success', 'Riwayat kunjungan IGD berhasil dihapus.');
          fetchRecords();
        } catch (err: any) {
          console.error(err);
          showFeedback('error', 'Gagal menghapus kunjungan.');
        }
      }
    });
  };

  const handleIcdChange = async (id: number, code: string) => {
    try {
      const rec = records.find(r => r.id === id);
      if (!rec) return;

      await api.put(`/pelayanan/igd/${id}`, {
        no_rm: rec.no_rm,
        nama_pasien: rec.nama_pasien,
        tanggal_pelayanan: rec.tanggal_pelayanan,
        triase: rec.triase || 'hijau',
        icd_kode: code || null,
        tindakan: rec.tindakan
      });
      showFeedback('success', `Berhasil mengaitkan kode diagnosa ICD-10 "${code}" ke pasien ${rec.nama_pasien}.`);
      fetchRecords();
    } catch (err) {
      console.error(err);
      showFeedback('error', 'Gagal mengaitkan kode diagnosa ICD-10.');
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

    const parseJenisKelamin = (jkStr: string): string => {
      if (!jkStr) return '';
      const j = jkStr.toLowerCase().trim();
      if (j.startsWith('l') || j === 'pria') return 'L';
      if (j.startsWith('p') || j === 'wanita') return 'P';
      return jkStr;
    };

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      let cols = line.split('\t').map(c => c.trim());
      if (cols.length < 5) {
        cols = line.split(/\s{2,}/).map(c => c.trim());
      }

      if (
        cols[0] === 'NO' || 
        cols[0] === 'No.' ||
        cols[1]?.toLowerCase().includes('pendaftaran') || 
        cols[1]?.toLowerCase().includes('reg') || 
        cols[2] === 'NO. RM' ||
        cols[2]?.toLowerCase().includes('rm')
      ) {
        headerSkipped = true;
        continue;
      }

      // Format requires at least 12 columns to get the tindakan name
      if (cols.length < 12) {
        continue;
      }

      const noReg = cols[1];
      const noRmCode = cols[2];
      const pName = cols[3];
      const tglLahir = cols[4] ? parseIndoDate(cols[4]) : '';
      const jk = cols[6] ? parseJenisKelamin(cols[6]) : '';
      const alamat = cols[7] || '';
      const kelurahan = cols[8] || '';
      const kecamatan = cols[9] || '';
      const kota = cols[10] || '';
      const tName = cols[11];
      const tTgl = cols[12] || '';
      const qtyRaw = cols[15] || '1';

      const cleanNum = (str: string) => {
        if (!str) return 0;
        const stripped = str.replace(/[^\d]/g, '');
        return Number(stripped) || 0;
      };

      const exec = 'Medis/Petugas IGD';
      const tJam = '08:00:00';
      const tTarif = 0;
      const tSarana = 0;
      const tPel = 0;
      const tMedis = 0;
      const qty = cleanNum(qtyRaw) || 1;
      const sub = 0;

      const formattedDate = parseIndoDate(tTgl);

      if (noReg && pName && tName) {
        tempActions.push({
          no_registrasi: noReg,
          no_rm: noRmCode,
          nama_pasien: pName,
          tanggal_pelayanan: formattedDate,
          pelaksana: exec,
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
          tanggal_lahir: tglLahir,
          jenis_kelamin: jk,
          alamat: alamat,
          kelurahan: kelurahan,
          kecamatan: kecamatan,
          kota: kota
        });
      }
    }

    const groupedMap: { [key: string]: any } = {};
    for (const act of tempActions) {
      const key = act.no_registrasi;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          no_registrasi: act.no_registrasi,
          no_rm: act.no_rm,
          nama_pasien: act.nama_pasien,
          tanggal_pelayanan: act.tanggal_pelayanan,
          triase: 'hijau',
          icd_kode: '',
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
        tindakan_keterangan: '',
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

  const updateParsedTriage = (idx: number, newTriage: string) => {
    const updated = [...parsedData];
    updated[idx] = {
      ...updated[idx],
      triase: newTriage
    };
    setParsedData(updated);
  };

  const updateParsedIcd = (idx: number, newIcd: string) => {
    const updated = [...parsedData];
    updated[idx] = {
      ...updated[idx],
      icd_kode: newIcd
    };
    setParsedData(updated);
  };

  const handleBulkInsert = async () => {
    if (parsedData.length === 0) return;
    setSubmitting(true);
    let successCount = 0;

    try {
      for (const p of parsedData) {
        await api.post('/pelayanan/igd', {
          no_registrasi: p.no_registrasi,
          no_rm: p.no_rm,
          nama_pasien: p.nama_pasien,
          tanggal_pelayanan: p.tanggal_pelayanan,
          triase: p.triase || 'hijau',
          icd_kode: p.icd_kode || null,
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
      showFeedback('success', `Masif sukses: Berhasil memasukkan ${successCount} data registrasi pasien IGD.`);
      setParsedData([]);
      setIsParsed(false);
      setRawText('');
      fetchRecords();
      setActiveTab('kunjungan');
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
  }, [searchQuery, triageFilter, procedureFilter, startDate, endDate]);

  // Filtered lists for rendering search query and triage
  const filteredRecords = (Array.isArray(records) ? records : []).filter(rec => {
    const q = searchQuery.toLowerCase();
    const matchesTriage = triageFilter === 'all' || String(rec.triase || 'hijau').toLowerCase() === triageFilter;
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
    return matchesTriage && matchesProcedure && matchesSearch;
  });

  // Calculate triage statistics
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

  let topDPJP = '-';
  let topDPJPCount = 0;
  Object.entries(dpjpMap).forEach(([name, count]) => {
    if (count > topDPJPCount) {
      topDPJP = name;
      topDPJPCount = count;
    }
  });

  const chartTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const allTreatmentData = Object.entries(procedureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const chartTrendData = Object.entries(dateMap)
    .map(([tanggal, data]) => ({
      tanggal: new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      kunjungan: data.kunjungan,
      pendapatan: data.pendapatan / 1000
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

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <div 
        className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100 gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            <span>Instalasi Gawat Darurat (IGD)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Pencatatan log kunjungan medis, rincian tindakan, pengisian triase, dan rekapitulasi pelayanan Instalasi Gawat Darurat (IGD).
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
          <p className="text-slate-400 font-mono text-xs mt-4">Mengakses data server IGD...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD & STATS */}
          {activeTab === 'statistik' && (
            <div className="space-y-6">
              {/* Core metrics bento boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Kunjungan Pasien */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
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
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Kunjungan Pasien IGD</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>

                {/* 2. Tindakan Medis */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
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
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Tindakan Medis IGD Dilakukan</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>



                {/* 4. DPJP Teraktif */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
                >
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
                </motion.div>
                
              </div>

              {/* Graphical trends */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Kunjungan & Pendapatan Harian */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.32 }}
                  className="bg-white p-5 rounded-2xl border border-slate-100/70 shadow-sm lg:col-span-2 space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-wide font-display">Grafik Tren Kunjungan & Omset Harian IGD</h3>
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
                </motion.div>

                {/* Chart 2: Top 5 Procedures */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="bg-white p-5 rounded-2xl border border-slate-100/70 shadow-sm space-y-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-wide font-display">5 Jenis Tindakan IGD Terbanyak</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Distribusi klasifikasi tindakan Instalasi Gawat Darurat</p>
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
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between text-[11px] font-medium text-slate-655 cursor-pointer p-1 rounded-md transition-colors ${procedureFilter === item.name ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50'}`}
                        onClick={() => setProcedureFilter(procedureFilter === item.name ? null : item.name)}
                      >
                        <div className="flex items-center space-x-2 truncate max-w-[12rem]">
                          <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800">{item.count} tindakan</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Additional Procedures Filter Section */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Semua Tindakan IGD:</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {allTreatmentData.map((item, idx) => (
                         <div 
                           key={idx} 
                           className={`p-2 rounded-lg cursor-pointer text-xs flex justify-between items-center ${procedureFilter === item.name ? 'bg-teal-100 text-teal-900' : 'hover:bg-slate-100'}`}
                           onClick={() => setProcedureFilter(procedureFilter === item.name ? null : item.name)}
                         >
                           <span className="truncate text-slate-700 font-medium">{item.name}</span>
                           <span className="font-bold text-slate-800">{item.count}</span>
                         </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* TOP 10 DIAGNOSA ICD-10 TERBANYAK */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-wide font-display flex items-center gap-2">
                      <Heart className="h-4.5 w-4.5 text-rose-500 fill-rose-100" />
                      <span>10 Diagnosa Terbanyak (ICD-10) - IGD</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Daftar klasifikasi diagnosa rekam medis IGD dengan kunjungan terbanyak</p>
                  </div>
                  <span className="text-[10px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-0.5 rounded-full self-start sm:self-auto shrink-0">
                    Kunjungan Terbanyak
                  </span>
                </div>

                {top10Diagnosa.length === 0 ? (
                  <div className="text-center py-10 text-slate-350 text-xs font-mono border border-dashed border-slate-200 rounded-2xl">
                    Belum ada diagnosa (ICD-10) tercatat pada rekam medis kunjungan IGD
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
                                <span className="font-medium text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md font-mono shrink-0">
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
                            <span className="text-xs font-medium text-slate-800 font-mono">
                              {item.count}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">
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
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.48 }}
                className="bg-slate-900 text-slate-200 p-6 rounded-3xl space-y-3.5 relative overflow-hidden shadow-md"
              >
                <div className="absolute top-[-20%] right-[-10%] w-[20rem] h-[20rem] bg-teal-500/10 rounded-full blur-[80px]" />
                <div className="flex items-center space-x-2.5 z-10 relative">
                  <FileText className="h-5 w-5 text-teal-400" />
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-teal-400">Instruksi Integrasi Impor Cepat IGD (Paste Excel)</h4>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 max-w-4xl z-10 relative">
                  Fasilitas kami mendukung penginputan rekam medis IGD secara masif dari spreadsheet Excel maupun kuitansi klaim. Salin penuh seluruh baris data tabular tindakan, masuk ke menu <strong>&ldquo;Import Teks&rdquo;</strong> di tab Input Data, tempelkan, dan sistem kami secara dinamis meng-grouping tindakan beruntun di bawah satu kode pendaftaran pasien IGD yang sama secara otomatis!
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
              </motion.div>
            </div>
          )}

          {/* TAB 2: DETAILED RECORDS GRID */}
          {activeTab === 'kunjungan' && (
            <div className="space-y-4">
              {/* Infografis Kunjungan Per Triase */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-50/40 p-4 rounded-3xl border border-slate-150"
              >
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
                          <span className={`text-[9px] font-medium ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-650'}`}>
                            {isActive ? '✓ Aktif Memfilter' : 'Klik Untuk Filter'}
                          </span>
                          <ArrowRight className={`h-2.5 w-2.5 transition-all ${isActive ? 'text-teal-500 translate-x-1' : 'text-slate-300 group-hover:translate-x-0.5 group-hover:text-slate-500'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right side: Mini pie chart viz of triage distribution (Col-span 1) */}
                <div className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                  <div className="text-left">
                    <span className="text-slate-400 text-[9px] font-medium uppercase tracking-widest block">Distribusi Persentase</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">Proporsi Kasus Triase IGD</span>
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
                        <span className="text-[7px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
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
                        <span className="text-[9px] font-medium text-slate-700 mt-0.5 font-mono">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-150 p-2.5 rounded-2xl">
                <span className="text-slate-450 text-[10px] font-medium uppercase tracking-wider pl-1.5">Filter Triase:</span>
                <button
                  onClick={() => { setTriageFilter('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium uppercase tracking-wider border transition-all cursor-pointer ${
                    triageFilter === 'all'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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

              {/* Search utility and date selection */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs text-slate-800 placeholder-slate-405 focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-300 transition-all"
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

                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-300 transition-all"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-100 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-300 transition-all"
                  />
                </div>

                <div className="text-slate-500 text-xs font-semibold">
                  Menampilkan <span className="text-teal-700 font-bold">{filteredRecords.length}</span> dari {records.length} registrasi pelayanan IGD
                </div>
              </motion.div>

              {/* Main Table Accordion */}
              {filteredRecords.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-12 text-center"
                >
                  <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">Daftar Kunjungan IGD Kosong</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Gunakan filter pencarian lain atau tambahkan pendaftaran pasien IGD baru.</p>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100/70 text-[10.5px] text-slate-500 font-semibold tracking-wider uppercase">
                          <th className="px-6 py-4.5">No. Registrasi / RM</th>
                          <th className="px-6 py-4.5">Nama Lengkap Pasien</th>
                          <th className="px-6 py-4.5">Diagnosis (ICD-10)</th>
                          <th className="px-6 py-4.5">DPJP</th>
                          <th className="px-6 py-4.5">Tanggal Kunjungan</th>
                          <th className="px-6 py-4.5 text-center">Jumlah Tindakan</th>
                          <th className="px-6 py-4.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        <AnimatePresence>
                          {paginatedRecords.map((rec, i) => {
                            const isExpanded = expandedId === rec.id;
                            const totalCost = rec.tindakan.reduce((sum, t) => sum + t.subtotal, 0);

                            return (
                              <React.Fragment key={rec.id}>
                                <motion.tr 
                                  variants={itemVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="hidden"
                                  custom={i}
                                  className="hover:bg-slate-50/30 transition-all"
                                >
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
                                  {(() => {
                                    const diag = rec.icd_kode;
                                    const icdInfo = icdList.find(i => i.kode_icd === diag);
                                    return diag ? (
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-slate-800 text-[11px]">{diag}</span>
                                        {icdInfo && <span className="text-slate-400 text-[10px] truncate max-w-[150px]">{icdInfo.deskripsi}</span>}
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-slate-400">-</span>
                                    );
                                  })()}
                                </td>
                                <td className="px-6 py-4.5">
                                  <span className="text-[11px] font-medium text-slate-700">
                                    {rec.dpjp || '-'}
                                  </span>
                                </td>
                                <td className="px-6 py-4.5 font-normal text-slate-600">
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
                                      className="p-1.5 text-slate-400 hover:text-slate-800 bg-slate-50/50 hover:bg-slate-100/80 border border-slate-100 rounded-lg transition-all cursor-pointer"
                                      title="Detail Tindakan"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>
                                    <button
                                      onClick={() => handleEditClick(rec)}
                                      className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-600 bg-amber-50/50 hover:shadow-xs border border-amber-100 rounded-lg transition-all cursor-pointer"
                                      title="Koreksi Data"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRecord(rec.id)}
                                      className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50/50 border border-rose-100 rounded-lg transition-all cursor-pointer"
                                      title="Hapus / Void"
                                      style={{ minHeight: '32px', minWidth: '32px' }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                                </motion.tr>

                              {/* Accordion inner tindakan rows */}
                              {isExpanded && (
                                <motion.tr 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-slate-50/50"
                                >
                                  <td colSpan={7} className="px-6 py-4.5 border-t border-b border-slate-100/80">
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h4 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider flex items-center space-x-1.5">
                                          <span>Rincian Tindakan Pelayanan Medis IGD</span>
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Kode Kunjungan Unik: ID #{rec.id}</span>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {rec.tindakan.map((t, index) => (
                                          <div key={index} className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-sm flex flex-col justify-between space-y-4">
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
                                  </td>
                                </motion.tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        </AnimatePresence>
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
                </motion.div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE TEXT BULK IMPORTER */}
          {activeTab === 'input' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Text Area Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                <div>
                  <span className="text-xs bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-extrabold uppercase tracking-widest leading-none">Automatic Pattern Reader</span>
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display mt-2">Impor Data Hasil Salinan Excel (IGD)</h3>
                  <p className="text-xs text-slate-400 mt-1">Tempelkan seluruh baris tabel spreadsheet Anda di bawah ini. Pastikan menyertakan baris header / judul kolom untuk memudahkan pembacaan.</p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={6}
                    placeholder={`No.\tNo. Pendaftaran\tNo. RM\tNama Pasien\tTanggal Lahir\tUmur\tJenis Kelamin\tAlamat\tKelurahan\tKecamatan\tKota\tNama Tindakan\tTanggal MRS\tTanggal KRS\tUnit\tJumlah\n1\tRJ21062026-00004\t002589\tAKBAR REPANJI\t24 Maret 2000\t26 Tahun 2 Bulan 28 Hari\tLaki - Laki\tJL P SENOPATI KARANG SARI BLOK 4 B\t\t\tKOTA BANDAR LAMPUNG\tAKOMODASI HOMECARE KENDARAAN PRIBADI 6-10 KM (MOTOR)\t21 Juni 2026\t21 Juni 2026\tPOLI UMUM\t1`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 bg-slate-55 border border-slate-200 text-slate-750 font-mono leading-relaxed rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 focus:outline-none"
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
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold transition-all cursor-pointer"
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
                        <p className="text-xs text-emerald-600 font-bold mt-1">Ditemukan {parsedData.length} grup kunjungan pasien IGD</p>
                      </div>
                      <span className="h-10 w-10 text-emerald-600 bg-emerald-50 rounded-full flex items-center justify-center font-black text-xs">
                        {parsedData.length}
                      </span>
                    </div>

                    {/* Preview patient block loop */}
                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                      {parsedData.map((p, idx) => {
                        return (
                          <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 font-sans space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold tracking-wide text-slate-800 text-xs uppercase block">{p.nama_pasien}</span>
                                <span className="text-xs text-slate-500 font-mono">Reg: {p.no_registrasi} • RM: #{p.no_rm}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-slate-400 text-xs font-mono">{p.tanggal_pelayanan}</span>
                              </div>
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
                            
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              {p.tindakan.map((t: any, sIdx: number) => (
                                <span key={sIdx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-xs text-slate-600 font-medium">
                                  {t.tindakan_nama} x{t.jumlah}
                                </span>
                              ))}
                            </div>

                            {/* Triage & Diagnosis Selector before saving */}
                            <div className="bg-slate-50/75 border border-slate-150 p-3 rounded-2xl mt-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Triase Kegawatan</label>
                                  <select
                                    value={p.triase || 'hijau'}
                                    onChange={(e) => updateParsedTriage(idx, e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                                  >
                                    <option value="hijau">Hijau (Non-Darurat)</option>
                                    <option value="kuning">Kuning (Darurat)</option>
                                    <option value="merah">Merah (Gawat Darurat)</option>
                                    <option value="hitam">Hitam (Meninggal)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnosa Masuk (ICD-10)</label>
                                  <select
                                    value={p.icd_kode || ''}
                                    onChange={(e) => updateParsedIcd(idx, e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                                  >
                                    <option value="">-- Pilih Diagnosis --</option>
                                    {icdList.map(icd => (
                                      <option key={icd.id} value={icd.kode_icd}>
                                        {icd.kode_icd} - {icd.deskripsi}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">DPJP</label>
                                  <select
                                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
                                    value={p.dpjp || ''}
                                    onChange={(e) => {
                                      const newData = [...parsedData];
                                      newData[idx].dpjp = e.target.value;
                                      setParsedData(newData);
                                    }}
                                  >
                                    <option value="">-- Pilih Dokter DPJP --</option>
                                    {dokterList.map(d => (
                                      <option key={d.id} value={d.nama_dokter}>{d.nama_dokter}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Status Terpilih</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${getTriageStyle(p.triase).bg}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${getTriageStyle(p.triase).dotBg}`} />
                                    <span>{getTriageStyle(p.triase).text}</span>
                                  </span>
                                  {p.icd_kode && (
                                    <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-150 uppercase tracking-wider">
                                      {p.icd_kode}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Confirm and post */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">* Tindakan akan di-link ke pasien baru/lama secara aman.</span>
                      <button
                        onClick={handleBulkInsert}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 transition active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
                        disabled={submitting}
                      >
                        {submitting ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    <Upload className="h-8 w-8 mx-auto text-slate-350 mb-2" />
                    Silakan tempel baris data tabel medis IGD dari Excel Anda di tab kiri lalu tekan tombol &quot;Proses&quot;.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANUAL CRUD REGISTRATION & CORRECTION MODAL */}
          {createPortal(
            <AnimatePresence>
              {isManualModalOpen && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-10 pb-10 px-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-teal-400">
                      {isEditMode ? 'Formulir Koreksi IGD (Gawat Darurat)' : 'Formulir Registrasi IGD (Gawat Darurat)'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Input detail data kunjungan beserta rincian tarif tindakan Instalasi Gawat Darurat secara manual</p>
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
                      <h4 className="text-xs font-semibold uppercase text-teal-600 tracking-wide">Identitas & Demutasi Kunjungan</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">No. Registrasi</label>
                        <input
                          type="text"
                          placeholder="Contoh: IGD16062026-00001"
                          value={noRegistrasi}
                          onChange={(e) => setNoRegistrasi(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
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
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">No. Rekam Medis (RM)</label>
                        <input
                          type="text"
                          placeholder="Contoh: 002494"
                          value={noRm}
                          onChange={(e) => setNoRm(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Nama Pasien</label>
                        <input
                          type="text"
                          placeholder="Contoh: RONDIYAH"
                          value={namaPasien}
                          onChange={(e) => setNamaPasien(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white uppercase"
                          required
                        />
                      </div>

                      {isNewPatient && !isEditMode && (
                        <div className="col-span-1 md:col-span-2 bg-teal-50/40 border border-teal-100 rounded-2xl p-4.5 space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-teal-100/60 pb-2">
                            <span className="text-[12px] font-bold text-teal-850 uppercase tracking-wider flex items-center">
                              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse" />
                              Data Pasien Baru (RM #{noRm} Belum Terdaftar)
                            </span>
                            <span className="text-[12px] text-slate-500">Lengkapi data rekam medis pasien baru</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Tanggal Lahir</label>
                              <input
                                type="date"
                                value={tanggalLahir}
                                onChange={(e) => setTanggalLahir(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                                required={isNewPatient}
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Jenis Kelamin</label>
                              <select
                                value={jenisKelamin}
                                onChange={(e) => setJenisKelamin(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                                required={isNewPatient}
                              >
                                <option value="L">Laki-laki (L)</option>
                                <option value="P">Perempuan (P)</option>
                              </select>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Alamat Lengkap</label>
                              <input
                                type="text"
                                placeholder="Nama jalan, RT/RW, Dusun"
                                value={alamat}
                                onChange={(e) => setAlamat(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Kelurahan / Desa</label>
                              <input
                                type="text"
                                placeholder="Contoh: Gedong Meneng"
                                value={kelurahan}
                                onChange={(e) => setKelurahan(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none uppercase"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Kecamatan</label>
                              <input
                                type="text"
                                placeholder="Contoh: Rajabasa"
                                value={kecamatan}
                                onChange={(e) => setKecamatan(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none uppercase"
                              />
                            </div>

                            <div className="col-span-1 md:col-span-2">
                              <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Kota / Kabupaten</label>
                              <input
                                type="text"
                                placeholder="Contoh: Kota Bandar Lampung"
                                value={kota}
                                onChange={(e) => setKota(e.target.value)}
                                className="mt-1.5 block w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Tanggal Pelayanan</label>
                        <input
                          type="date"
                          value={tanggalPelayanan}
                          onChange={(e) => setTanggalPelayanan(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Tingkatan Triase Kegawatan</label>
                        <select
                          value={triase}
                          onChange={(e) => setTriase(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="hijau">Hijau - Non Darurat</option>
                          <option value="kuning">Kuning - Darurat</option>
                          <option value="hitam">Hitam - Meninggal</option>
                          <option value="merah">Merah - Gawat Darurat</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">DPJP (Dokter Penanggung Jawab Pasien)</label>
                        <select
                          value={dpjp}
                          onChange={(e) => setDpjp(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                          required
                        >
                          <option value="">-- Pilih Dokter --</option>
                          {dokterList.map(d => (
                            <option key={d.id} value={d.nama_dokter}>{d.nama_dokter}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Diagnosis (ICD-10)</label>
                        <select
                          value={icdKode}
                          onChange={(e) => setIcdKode(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
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
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Layanan/Tindakan Medis</label>
                              <input
                                type="text"
                                placeholder="Contoh: KONSULTASI DOKTER UMUM"
                                value={t.tindakan_nama}
                                onChange={(e) => updateManualTindakanField(index, 'tindakan_nama', e.target.value)}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Keterangan Tambahan</label>
                              <input
                                type="text"
                                placeholder="Opsional"
                                value={t.tindakan_keterangan}
                                onChange={(e) => updateManualTindakanField(index, 'tindakan_keterangan', e.target.value)}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Tanggal Tindakan</label>
                              <input
                                type="date"
                                value={t.tindakan_tanggal}
                                onChange={(e) => updateManualTindakanField(index, 'tindakan_tanggal', e.target.value)}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Waktu (Jam)</label>
                              <input
                                type="time"
                                step={1}
                                value={t.tindakan_jam}
                                onChange={(e) => updateManualTindakanField(index, 'tindakan_jam', e.target.value)}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white font-mono"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider">Jumlah (QTY)</label>
                              <input
                                type="number"
                                min={1}
                                value={t.jumlah}
                                onChange={(e) => updateManualTindakanField(index, 'jumlah', e.target.value)}
                                className="mt-1.5 block w-full px-3 py-2 bg-white border border-slate-150 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white font-mono"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit button bar */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 pl-1">
                      Jumlah Tindakan: <span className="text-slate-800 font-mono text-xs">{manualTindakan.length} Item</span>
                    </div>
                    <div className="flex space-x-2.5">
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
                  </div>
                </form>
              </motion.div>
            </div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
