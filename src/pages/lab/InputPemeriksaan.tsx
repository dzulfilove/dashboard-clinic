import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  FlaskConical, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Info,
  ArrowRight,
  Database,
  Search,
  Trash2,
  ClipboardList,
  Filter,
  Pencil,
  X,
  UserPlus,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import Swal from '../../utils/swal.js';
import api from '../../services/api.js';
import { LabParameter, ParsedLabItem } from '../../types.js';
import { formatTanggalIndo, parseIndoDate } from '../../utils/dateFormat.js';
import { SearchableSelect } from '../../components/SearchableSelect.js';

export default React.memo(function InputPemeriksaan() {
  const { user } = useAuthStore();
  
  // Tab State: 'manual' | 'import' | 'rekap' | 'tersimpan'
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'rekap' | 'tersimpan'>('manual');

  // Parameters & loading states
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  
  // Dokter List (for DPJP dropdown)
  const [dokterList, setDokterList] = useState<any[]>([]);

  // ==================== 1. FORMULIR INPUT MANUAL ====================
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };

  const generateAutoNoReg = () => {
    const today = (manualTanggal || getTodayDateString()).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `REG-LAB-${today}-${rand}`;
  };

  const [manualTanggal, setManualTanggal] = useState(getTodayDateString());
  const [manualNoReg, setManualNoReg] = useState(generateAutoNoReg());
  const [manualNoRm, setManualNoRm] = useState('');
  const [manualNama, setManualNama] = useState('');
  const [manualNik, setManualNik] = useState('');
  const [manualParamId, setManualParamId] = useState<number | null>(null);
  const [manualDpjp, setManualDpjp] = useState('');

  // Pasien Search / Auto-suggest for Manual Form
  const [pasienSearchQuery, setPasienSearchQuery] = useState('');
  const [pasienSuggestions, setPasienSuggestions] = useState<any[]>([]);
  const [isSearchingPasien, setIsSearchingPasien] = useState(false);
  const [showPasienDropdown, setShowPasienDropdown] = useState(false);

  // Search Pasien debounced
  useEffect(() => {
    if (!pasienSearchQuery || pasienSearchQuery.trim().length < 2) {
      setPasienSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingPasien(true);
      try {
        const res = await api.get('/pasien', { params: { search: pasienSearchQuery.trim(), limit: 8 } });
        if (res.data && Array.isArray(res.data.data)) {
          setPasienSuggestions(res.data.data);
        } else if (Array.isArray(res.data)) {
          setPasienSuggestions(res.data);
        }
      } catch (e) {
        console.warn('Gagal mencari data pasien:', e);
      } finally {
        setIsSearchingPasien(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [pasienSearchQuery]);

  const handleSelectPasien = (p: any) => {
    setManualNoRm(p.no_rm || '');
    setManualNama(p.nama || '');
    setManualNik(p.nik || '');
    setShowPasienDropdown(false);
    setPasienSearchQuery('');
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualParamId) {
      Swal.fire({
        title: 'Parameter Belum Dipilih',
        text: 'Silakan pilih parameter pemeriksaan laboratorium terlebih dahulu.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }
    if (!manualNoRm.trim() || !manualNama.trim()) {
      Swal.fire({
        title: 'Data Pasien Tidak Lengkap',
        text: 'Nomor RM dan Nama Pasien wajib diisi.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    setSavingManual(true);
    try {
      const payload = {
        no_registrasi: manualNoReg.trim() || generateAutoNoReg(),
        parameter_id: Number(manualParamId),
        pasien_no_rm: manualNoRm.trim(),
        pasien_nama: manualNama.trim(),
        pasien_nik: manualNik.trim() || null,
        dpjp: manualDpjp.trim() || null,
        tanggal_pemeriksaan: manualTanggal
      };

      const res = await api.post('/lab/pemeriksaan', payload);

      await Swal.fire({
        title: 'Pemeriksaan Tersimpan!',
        text: `Data pemeriksaan untuk pasien ${manualNama} berhasil disimpan ke database.`,
        icon: 'success',
        confirmButtonColor: '#0d9488'
      });

      // Reset manual form with new unique No. Reg
      setManualNoReg(generateAutoNoReg());
      setManualNoRm('');
      setManualNama('');
      setManualNik('');

      // Refresh saved records and switch to tersimpan tab
      fetchSavedRecords(1);
      setActiveTab('tersimpan');
    } catch (err: any) {
      console.error('Gagal menyimpan pemeriksaan lab:', err);
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan data pemeriksaan ke database.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setSavingManual(false);
    }
  };

  // ==================== 2. IMPORT MASSAL ====================
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedLabItem[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<{ [k: string]: boolean }>({});
  const [isParsed, setIsParsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Normalizer Helper
  const normalizeNik = (nik: string | undefined): string | null => {
    if (!nik) return null;
    const clean = nik.replace(/\D/g, '');
    if (clean === '0' || clean.length < 5 || /^0+$/.test(clean)) return null;
    return clean;
  };

  const matchDoctor = (rawDoc: string | undefined): string | null => {
    if (!rawDoc || rawDoc === '-' || rawDoc.toLowerCase() === 'n/a') return null;
    const clean = rawDoc.trim().toLowerCase();
    const found = dokterList.find(d => {
      const name = (d.nama_dokter || d.nama || '').toLowerCase();
      return name.includes(clean) || clean.includes(name);
    });
    return found ? (found.nama_dokter || found.nama) : rawDoc.trim();
  };

  // Smart Parser
  const handleParse = () => {
    if (!rawText.trim()) {
      Swal.fire({ title: 'Teks Kosong', text: 'Silakan tempel data tabel terlebih dahulu.', icon: 'warning', confirmButtonColor: '#0d9488' });
      return;
    }

    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: ParsedLabItem[] = [];
    const uniqueReg = new Set();
    const selects: { [k: string]: boolean } = {};

    lines.forEach((line, lineIndex) => {
      let cols = line.split('\t').map(c => c.trim());
      if (cols.length < 3) cols = line.split(';').map(c => c.trim());
      if (cols.length < 3) cols = line.split(/\s{2,}/).map(c => c.trim());
      if (cols.length < 3) cols = line.split(',').map(c => c.trim());
      if (cols.length < 2) return;

      // Skip header line
      const firstCol = (cols[0] || '').toLowerCase();
      const secondCol = (cols[1] || '').toLowerCase();
      if (firstCol.includes('no') && (secondCol.includes('pendaftaran') || secondCol.includes('registrasi') || secondCol.includes('rm') || secondCol.includes('nama'))) {
        return;
      }

      let no_registrasi = '';
      let no_rm = '';
      let nik: string | null = null;
      let nama_pasien = '';
      let dpjp: string | null = null;
      let tanggal_pemeriksaan = manualTanggal || getTodayDateString();

      // Detection based on column count
      if (cols.length >= 7) {
        // Standard SIMRS Export: No | No Reg | No RM | NIK | Nama | Dokter | Tanggal
        no_registrasi = cols[1];
        no_rm = cols[2];
        nik = normalizeNik(cols[3]);
        nama_pasien = cols[4];
        dpjp = matchDoctor(cols[5]);
        tanggal_pemeriksaan = parseIndoDate(cols[6]);
      } else if (cols.length === 6) {
        // No Reg | No RM | NIK | Nama | Dokter | Tanggal OR No | No RM | NIK | Nama | Dokter | Tanggal
        if (cols[0].toUpperCase().startsWith('REG') || cols[0].length > 8) {
          no_registrasi = cols[0];
          no_rm = cols[1];
          nik = normalizeNik(cols[2]);
          nama_pasien = cols[3];
          dpjp = matchDoctor(cols[4]);
          tanggal_pemeriksaan = parseIndoDate(cols[5]);
        } else {
          no_rm = cols[1];
          nik = normalizeNik(cols[2]);
          nama_pasien = cols[3];
          dpjp = matchDoctor(cols[4]);
          tanggal_pemeriksaan = parseIndoDate(cols[5]);
        }
      } else if (cols.length === 5) {
        // No RM | Nama | NIK | Dokter | Tanggal
        no_rm = cols[0];
        nama_pasien = cols[1];
        nik = normalizeNik(cols[2]);
        dpjp = matchDoctor(cols[3]);
        tanggal_pemeriksaan = parseIndoDate(cols[4]);
      } else if (cols.length === 4) {
        // No RM | Nama | Dokter | Tanggal
        no_rm = cols[0];
        nama_pasien = cols[1];
        dpjp = matchDoctor(cols[2]);
        tanggal_pemeriksaan = parseIndoDate(cols[3]);
      } else {
        // No RM | Nama
        no_rm = cols[0];
        nama_pasien = cols[1];
      }

      // Auto-generate No. Registrasi if missing
      if (!no_registrasi || no_registrasi === '-' || no_registrasi === 'null') {
        const dateClean = (tanggal_pemeriksaan || getTodayDateString()).replace(/-/g, '');
        no_registrasi = `REG-LAB-${dateClean}-${Math.floor(1000 + lineIndex * 10 + Math.random() * 900)}`;
      }

      if (!no_rm || !nama_pasien) return;

      if (!uniqueReg.has(no_registrasi)) {
        uniqueReg.add(no_registrasi);
        parsed.push({
          no_registrasi,
          no_rm,
          nik,
          nama_pasien,
          dpjp,
          tanggal_pemeriksaan
        });
        selects[no_registrasi] = true;
      }
    });

    if (parsed.length === 0) {
      Swal.fire({
        title: 'Format Data Tidak Dikenali',
        text: 'Pastikan data mengandung setidaknya kolom No. RM dan Nama Pasien. Gunakan tombol "Contoh Format" untuk melihat panduan.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    setParsedData(parsed);
    setSelectedRows(selects);
    setIsParsed(true);

    Swal.fire({
      title: 'Data Berhasil Diurai!',
      text: `Ditemukan ${parsed.length} baris data pasien yang siap diimport.`,
      icon: 'success',
      confirmButtonColor: '#0d9488'
    });
  };

  const handleUseDemoTemplate = () => {
    const today = getTodayDateString();
    const demo = [
      `1\tREG-2026-0001\tRM-10291\t3201019283740001\tBudi Santoso\tDr. Hendra Wijaya\t${today}`,
      `2\tREG-2026-0002\tRM-10292\t3201019283740002\tSiti Aminah\tDr. Sri Rahayu\t${today}`,
      `3\tREG-2026-0003\tRM-10293\t3201019283740003\tAhmad Fauzi\tDr. Hendra Wijaya\t${today}`
    ].join('\n');
    setRawText(demo);
  };

  const handleSaveImport = async () => {
    if (!selectedParameter) {
      Swal.fire({
        title: 'Parameter Belum Dipilih',
        text: 'Silakan pilih jenis pemeriksaan laboratorium terlebih dahulu pada menu di atas.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    const itemsToSave = parsedData.filter(d => selectedRows[d.no_registrasi]);
    if (itemsToSave.length === 0) {
      Swal.fire({
        title: 'Tidak Ada Data Terpilih',
        text: 'Centang setidaknya satu pasien yang akan disimpan.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/lab/pemeriksaan/import', {
        parameter_id: Number(selectedParameter),
        items: itemsToSave
      });

      const { inserted, skipped, created_pasien, skipped_items } = res.data;
      
      let msg = `Berhasil menyimpan ${inserted} pemeriksaan laboratorium.`;
      if (created_pasien > 0) msg += ` (${created_pasien} pasien baru otomatis terdaftar).`;
      if (skipped > 0) {
        const sampleReasons = (skipped_items || []).slice(0, 3).map((s: any) => `• ${s.no_registrasi}: ${s.reason}`).join('\n');
        msg += `\n\n${skipped} data dilewati:\n${sampleReasons}`;
      }

      await Swal.fire({
        title: inserted > 0 ? 'Import Selesai!' : 'Perhatian',
        text: msg,
        icon: inserted > 0 ? 'success' : 'warning',
        confirmButtonColor: '#0d9488'
      });

      if (inserted > 0) {
        setRawText('');
        setParsedData([]);
        setIsParsed(false);
      }
      fetchSavedRecords(1);
      setActiveTab('tersimpan');
    } catch (err: any) {
      console.error('Gagal import lab pemeriksaan:', err);
      Swal.fire({
        title: 'Gagal Import Data',
        text: err.response?.data?.message || 'Terjadi kesalahan saat memproses data import.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== 3. REKAPITULASI JUMLAH HARIAN ====================
  const [selectedRekapDate, setSelectedRekapDate] = useState(getTodayDateString());
  const [quantities, setQuantities] = useState<{ [paramId: number]: string }>({});
  const [savingRekap, setSavingRekap] = useState(false);

  const fetchDailyData = useCallback(async () => {
    if (parameters.length === 0) return;
    setLoadingData(true);
    try {
      const res = await api.get(`/lab/data?tanggal=${selectedRekapDate}`);
      const dataRows: any[] = res.data;
      const quantityMap: { [id: number]: string } = {};
      parameters.forEach(p => {
        const found = dataRows.find((row: any) => row.parameter_id === p.id);
        quantityMap[p.id] = found && found.jumlah !== undefined ? String(found.jumlah) : '0';
      });
      setQuantities(quantityMap);
    } catch (err) {
      console.error('Failed to fetch daily lab data', err);
    } finally {
      setLoadingData(false);
    }
  }, [parameters, selectedRekapDate]);

  useEffect(() => {
    if (activeTab === 'rekap') {
      fetchDailyData();
    }
  }, [activeTab, fetchDailyData]);

  const handleQuantityChange = (paramId: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setQuantities(prev => ({ ...prev, [paramId]: value }));
    }
  };

  const handleSaveRekap = async () => {
    setSavingRekap(true);
    try {
      const payload = {
        tanggal: selectedRekapDate,
        data: parameters.map(p => ({
          parameter_id: p.id,
          jumlah: quantities[p.id] !== undefined && quantities[p.id] !== '' ? parseInt(quantities[p.id], 10) : 0
        }))
      };

      await api.post('/lab/data', payload);
      Swal.fire({
        title: 'Rekap Berhasil Disimpan!',
        text: `Data rekap harian untuk tanggal ${formatTanggalIndo(selectedRekapDate)} telah tersimpan.`,
        icon: 'success',
        confirmButtonColor: '#0d9488'
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'Gagal Menyimpan Rekap',
        text: err.response?.data?.message || 'Terjadi kesalahan sistem saat menyimpan rekap harian.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setSavingRekap(false);
    }
  };

  // ==================== 4. DATA TERSIMPAN & PAGINASI ====================
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [searchSaved, setSearchSaved] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalServerRecords, setTotalServerRecords] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const recordsPerPage = 12;

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNoRegistrasi, setEditNoRegistrasi] = useState('');
  const [editPasienNoRm, setEditPasienNoRm] = useState('');
  const [editPasienNama, setEditPasienNama] = useState('');
  const [editPasienNik, setEditPasienNik] = useState('');
  const [editDpjp, setEditDpjp] = useState('');
  const [editTanggalPemeriksaan, setEditTanggalPemeriksaan] = useState('');
  const [editParameterId, setEditParameterId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchSavedRecords = useCallback(async (page = currentPage, search = searchSaved, cat = filterCategory) => {
    setLoadingSaved(true);
    try {
      const res = await api.get('/lab/pemeriksaan', {
        params: {
          page,
          limit: recordsPerPage,
          search,
          category: cat
        }
      });
      if (res.data && Array.isArray(res.data.data)) {
        setSavedRecords(res.data.data);
        setTotalServerRecords(res.data.total);
        setServerTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.page || page);
      } else {
        const dataArr = Array.isArray(res.data) ? res.data : [];
        setSavedRecords(dataArr);
        setTotalServerRecords(dataArr.length);
        setServerTotalPages(Math.ceil(dataArr.length / recordsPerPage) || 1);
      }
    } catch (err: any) {
      console.error('Failed to fetch saved lab records', err);
    } finally {
      setLoadingSaved(false);
    }
  }, [currentPage, searchSaved, filterCategory, recordsPerPage]);

  useEffect(() => {
    if (activeTab === 'tersimpan') {
      fetchSavedRecords(currentPage, searchSaved, filterCategory);
    }
  }, [activeTab, currentPage, searchSaved, filterCategory, fetchSavedRecords]);

  // Initial Load for Master Parameters & Dokter
  const fetchActiveParameters = useCallback(async () => {
    setLoadingParams(true);
    try {
      const res = await api.get('/lab/parameter');
      if (Array.isArray(res.data)) {
        setParameters(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch lab parameters', err);
    } finally {
      setLoadingParams(false);
    }
  }, []);

  const fetchDokterList = useCallback(async () => {
    try {
      const res = await api.get('/dokter', { params: { all: 'true' } });
      if (Array.isArray(res.data)) {
        setDokterList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch dokter list', err);
    }
  }, []);

  useEffect(() => {
    fetchActiveParameters();
    fetchDokterList();
  }, [fetchActiveParameters, fetchDokterList]);

  // Handle Edit Record
  const handleOpenEditModal = (rec: any) => {
    setEditId(rec.id);
    setEditNoRegistrasi(rec.no_registrasi || '');
    setEditPasienNoRm(rec.pasien_no_rm || '');
    setEditPasienNama(rec.pasien_nama || '');
    setEditPasienNik(rec.pasien_nik || '');
    setEditDpjp(rec.dpjp || '');
    setEditTanggalPemeriksaan(rec.tanggal_pemeriksaan ? rec.tanggal_pemeriksaan.substring(0, 10) : getTodayDateString());
    setEditParameterId(rec.parameter_id || null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    if (!editNoRegistrasi.trim() || !editPasienNoRm.trim() || !editPasienNama.trim() || !editTanggalPemeriksaan.trim() || !editParameterId) {
      Swal.fire({
        title: 'Data Belum Lengkap',
        text: 'Semua kolom bertanda bintang (*) wajib diisi.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    setUpdating(true);
    try {
      await api.put(`/lab/pemeriksaan/${editId}`, {
        no_registrasi: editNoRegistrasi.trim(),
        parameter_id: Number(editParameterId),
        pasien_no_rm: editPasienNoRm.trim(),
        pasien_nik: editPasienNik.trim() || null,
        pasien_nama: editPasienNama.trim(),
        dpjp: editDpjp.trim() || null,
        tanggal_pemeriksaan: editTanggalPemeriksaan
      });

      await Swal.fire({
        title: 'Berhasil Diperbarui!',
        text: 'Data pemeriksaan laboratorium berhasil diperbarui.',
        icon: 'success',
        confirmButtonColor: '#0d9488'
      });

      setIsEditing(false);
      fetchSavedRecords(currentPage);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'Gagal Memperbarui',
        text: err.response?.data?.message || 'Gagal memperbarui data pemeriksaan.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRecord = async (id: number, patientName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Pemeriksaan?',
      text: `Apakah Anda yakin ingin menghapus data pemeriksaan untuk ${patientName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#e11d48',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/lab/pemeriksaan/${id}`);
        await Swal.fire({
          title: 'Terhapus!',
          text: 'Data pemeriksaan berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#0d9488'
        });
        fetchSavedRecords(currentPage);
      } catch (err: any) {
        console.error(err);
        Swal.fire({
          title: 'Gagal Menghapus',
          text: err.response?.data?.message || 'Gagal menghapus data pemeriksaan.',
          icon: 'error',
          confirmButtonColor: '#0d9488'
        });
      }
    }
  };

  // Categorized Parameters
  const categorizedParameters = useMemo(() => {
    const grouped: { [cat: string]: LabParameter[] } = {};
    parameters.forEach(p => {
      const cat = p.kategori || 'UMUM';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return grouped;
  }, [parameters]);

  const categoryList = useMemo(() => {
    return Array.from(new Set(parameters.map(p => p.kategori).filter(Boolean)));
  }, [parameters]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-200/50 dark:border-teal-800/50">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Entri Pemeriksaan Laboratorium
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pencatatan data pemeriksaan laboratorium pasien, import antrean massal, dan rekapitulasi harian
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'manual'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Input Formulir Pasien</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'import'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Tabel / Antrean</span>
            </button>
            <button
              onClick={() => setActiveTab('rekap')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'rekap'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Rekap Harian Cepat</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('tersimpan');
                fetchSavedRecords(1);
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'tersimpan'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Data Pemeriksaan Tersimpan</span>
              {totalServerRecords > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                  activeTab === 'tersimpan' ? 'bg-teal-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {totalServerRecords}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: FORMULIR INPUT MANUAL ==================== */}
      {activeTab === 'manual' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Formulir Entri Pemeriksaan Laboratorium
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Input data pemeriksaan per pasien langsung ke database tanpa perlu copy-paste tabel
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setManualNoReg(generateAutoNoReg());
                setManualNoRm('');
                setManualNama('');
                setManualNik('');
              }}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Form</span>
            </button>
          </div>

          <form onSubmit={handleSaveManual} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Tanggal Pemeriksaan */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Tanggal Pemeriksaan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={manualTanggal}
                    onChange={(e) => setManualTanggal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* No Registrasi */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    No. Registrasi <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setManualNoReg(generateAutoNoReg())}
                    className="text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={manualNoReg}
                  onChange={(e) => setManualNoReg(e.target.value)}
                  placeholder="Contoh: REG-LAB-20260814-1029"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Parameter Pemeriksaan Lab */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Jenis Pemeriksaan Lab <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={parameters.map(p => ({
                    value: p.id,
                    label: `${p.nama_parameter} (${p.kategori || 'Umum'})`
                  }))}
                  value={manualParamId || ''}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    setManualParamId(rawVal ? Number(rawVal) : null);
                  }}
                  placeholder="-- Pilih Jenis Pemeriksaan --"
                />
              </div>

              {/* Pencarian Pasien Master */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Cari Pasien Terdaftar (Opsional)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={pasienSearchQuery}
                    onFocus={() => setShowPasienDropdown(true)}
                    onChange={(e) => {
                      setPasienSearchQuery(e.target.value);
                      setShowPasienDropdown(true);
                    }}
                    placeholder="Ketik No. RM atau Nama Pasien..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                  {isSearchingPasien && (
                    <RefreshCw className="w-4 h-4 text-teal-600 animate-spin absolute right-3.5 top-3" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showPasienDropdown && pasienSuggestions.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {pasienSuggestions.map((p: any) => (
                      <button
                        key={p.no_rm}
                        type="button"
                        onClick={() => handleSelectPasien(p)}
                        className="w-full text-left px-3.5 py-2 hover:bg-teal-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">{p.nama}</span>
                          <span className="text-[11px] text-slate-500 ml-2 font-mono">RM: {p.no_rm}</span>
                        </div>
                        {p.nik && <span className="text-[10px] text-slate-400 font-mono">NIK: {p.nik}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* No. Rekam Medis (RM) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nomor Rekam Medis (RM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualNoRm}
                  onChange={(e) => setManualNoRm(e.target.value)}
                  placeholder="Contoh: RM-00123"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* Nama Pasien */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Pasien <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualNama}
                  onChange={(e) => setManualNama(e.target.value)}
                  placeholder="Nama Lengkap Pasien"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              {/* NIK Pasien */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  NIK Pasien (16 digit)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={manualNik}
                  onChange={(e) => setManualNik(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 320101..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Dokter DPJP */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Dokter DPJP / Perujuk
                </label>
                <SearchableSelect
                  options={dokterList.map(d => ({
                    value: d.nama_dokter || d.nama,
                    label: d.nama_dokter || d.nama
                  }))}
                  value={manualDpjp}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    setManualDpjp(rawVal ? String(rawVal) : '');
                  }}
                  placeholder="-- Pilih Dokter DPJP --"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={savingManual}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {savingManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pemeriksaan Lab</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================== TAB 2: IMPORT TABEL MASSAL ==================== */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Import Data Pemeriksaan Pasien (Copy-Paste)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Salin seluruh baris tabel dari antrean pelayanan, spreadsheet, atau SIMRS lalu tempel di bawah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseDemoTemplate}
                className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Gunakan Contoh Format</span>
              </button>
            </div>

            {/* Step 1: Pilih Parameter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Pilih Jenis Pemeriksaan Laboratorium <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={parameters.map(p => ({
                    value: p.id,
                    label: `${p.nama_parameter} (${p.kategori || 'Umum'})`
                  }))}
                  value={selectedParameter || ''}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    setSelectedParameter(rawVal ? Number(rawVal) : null);
                  }}
                  placeholder="-- Pilih Jenis Pemeriksaan --"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>
                  Mendukung kolom standar: <strong>No | No. Registrasi | No. RM | NIK | Nama Pasien | Dokter DPJP | Tanggal</strong> (Pemisah Tab, Titik Koma, atau Koma).
                </span>
              </div>
            </div>

            {/* Step 2: Textarea Copy-Paste */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Tempelkan Data Tabel Pasien Di Sini
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={5}
                placeholder={`Contoh isi data yang di-paste:\n1\tREG-2026-0001\tRM-10291\t3201019283740001\tBudi Santoso\tDr. Hendra Wijaya\t${getTodayDateString()}\n2\tREG-2026-0002\tRM-10292\t3201019283740002\tSiti Aminah\tDr. Sri Rahayu\t${getTodayDateString()}`}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleParse}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Proses & Urai Data</span>
              </button>
            </div>
          </div>

          {/* Step 3: Hasil Parse & Preview Table */}
          {isParsed && parsedData.length > 0 && (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Preview Data Siap Disimpan ({parsedData.length} Pasien)
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const all: { [k: string]: boolean } = {};
                      parsedData.forEach(d => { all[d.no_registrasi] = true; });
                      setSelectedRows(all);
                    }}
                    className="text-xs text-teal-600 hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedRows({})}
                    className="text-xs text-slate-500 hover:underline font-medium"
                  >
                    Batal Pilih
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-700/60">
                    <tr>
                      <th className="p-3 w-10 text-center">Pilih</th>
                      <th className="p-3">No. Registrasi</th>
                      <th className="p-3">No. RM</th>
                      <th className="p-3">NIK</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Dokter DPJP</th>
                      <th className="p-3">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {parsedData.map((row) => (
                      <tr key={row.no_registrasi} className="hover:bg-teal-50/40 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!selectedRows[row.no_registrasi]}
                            onChange={(e) => setSelectedRows(prev => ({ ...prev, [row.no_registrasi]: e.target.checked }))}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">{row.no_registrasi}</td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.no_rm}</td>
                        <td className="p-3 font-mono text-slate-500">{row.nik || '-'}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{row.nama_pasien}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.dpjp || '-'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{formatTanggalIndo(row.tanggal_pemeriksaan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveImport}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Semua Data Terpilih ({Object.values(selectedRows).filter(Boolean).length} Pasien)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: REKAPITULASI JUMLAH HARIAN ==================== */}
      {activeTab === 'rekap' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Rekapitulasi Jumlah Harian Laboratorium
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Input kuantitas pemeriksaan secara langsung per parameter untuk tanggal tertentu
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedRekapDate}
                onChange={(e) => setSelectedRekapDate(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={fetchDailyData}
                disabled={loadingData}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 rounded-lg bg-slate-100 dark:bg-slate-800"
                title="Refresh data rekap"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Grouped Categories */}
          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-xs">Memuat data rekap laboratorium...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(categorizedParameters).map((cat) => (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {cat}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {categorizedParameters[cat].map((param) => (
                      <div
                        key={param.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between gap-3"
                      >
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={param.nama_parameter}>
                          {param.nama_parameter}
                        </span>
                        <input
                          type="text"
                          value={quantities[param.id] ?? '0'}
                          onChange={(e) => handleQuantityChange(param.id, e.target.value)}
                          className="w-16 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-center text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={handleSaveRekap}
                  disabled={savingRekap}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  {savingRekap ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Rekap...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Rekapitulasi Harian</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 4: DATA PEMERIKSAAN TERSIMPAN ==================== */}
      {activeTab === 'tersimpan' && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 shadow-sm space-y-5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Data Pemeriksaan Laboratorium Pasien
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total {totalServerRecords} data pemeriksaan pasien tersimpan di database
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Semua Kategori</option>
                {categoryList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchSaved}
                  onChange={(e) => {
                    setSearchSaved(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari pasien, RM, no reg..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => fetchSavedRecords(currentPage)}
                disabled={loadingSaved}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-teal-600 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loadingSaved ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          {loadingSaved ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-xs">Memuat daftar pemeriksaan tersimpan...</span>
            </div>
          ) : savedRecords.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400">
                <FlaskConical className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Belum Ada Data Pemeriksaan Tersimpan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Belum ada data pemeriksaan laboratorium yang tercatat. Silakan input data melalui tab "Input Formulir Pasien" atau "Import Tabel".
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pemeriksaan Baru</span>
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-700/60">
                    <tr>
                      <th className="p-3 w-12 text-center">No</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">No. Registrasi</th>
                      <th className="p-3">No. RM</th>
                      <th className="p-3">NIK</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Pemeriksaan Lab</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Dokter DPJP</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {savedRecords.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-teal-50/40 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-500">
                          {(currentPage - 1) * recordsPerPage + idx + 1}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {formatTanggalIndo(item.tanggal_pemeriksaan)}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                          {item.no_registrasi}
                        </td>
                        <td className="p-3 font-mono font-medium text-teal-600 dark:text-teal-400">
                          {item.pasien_no_rm}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.pasien_nik || '-'}
                        </td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {item.pasien_nama}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.nama_parameter || 'Pemeriksaan Lab'}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-medium text-[10px]">
                            {item.kategori || 'Umum'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {item.dpjp || '-'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit Data"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(item.id, item.pasien_nama)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {serverTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan halaman {currentPage} dari {serverTotalPages} (Total {totalServerRecords} data)
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: Math.min(5, serverTotalPages) }, (_, i) => {
                      let pNum = i + 1;
                      if (serverTotalPages > 5) {
                        if (currentPage > 3) pNum = currentPage - 2 + i;
                        if (pNum > serverTotalPages) pNum = serverTotalPages - 4 + i;
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                            currentPage === pNum
                              ? 'bg-teal-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      disabled={currentPage >= serverTotalPages}
                      onClick={() => setCurrentPage(prev => Math.min(serverTotalPages, prev + 1))}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ==================== EDIT MODAL ==================== */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-5"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-teal-600" />
                <span>Edit Pemeriksaan Laboratorium</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tanggal Pemeriksaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={editTanggalPemeriksaan}
                  onChange={(e) => setEditTanggalPemeriksaan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenis Pemeriksaan <span className="text-rose-500">*</span>
                </label>
                <SearchableSelect
                  options={parameters.map(p => ({
                    value: p.id,
                    label: `${p.nama_parameter} (${p.kategori || 'Umum'})`
                  }))}
                  value={editParameterId || ''}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    setEditParameterId(rawVal ? Number(rawVal) : null);
                  }}
                  placeholder="-- Pilih Parameter --"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    No. Registrasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editNoRegistrasi}
                    onChange={(e) => setEditNoRegistrasi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    No. RM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editPasienNoRm}
                    onChange={(e) => setEditPasienNoRm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pasien <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editPasienNama}
                    onChange={(e) => setEditPasienNama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    NIK Pasien
                  </label>
                  <input
                    type="text"
                    maxLength={16}
                    value={editPasienNik}
                    onChange={(e) => setEditPasienNik(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Dokter DPJP / Perujuk
                </label>
                <SearchableSelect
                  options={dokterList.map(d => ({
                    value: d.nama_dokter || d.nama,
                    label: d.nama_dokter || d.nama
                  }))}
                  value={editDpjp}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    setEditDpjp(rawVal ? String(rawVal) : '');
                  }}
                  placeholder="-- Pilih Dokter DPJP --"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {updating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
});
