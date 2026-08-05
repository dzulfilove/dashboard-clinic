import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  FlaskConical, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Calculator, 
  Info,
  ListPlus,
  ArrowRight,
  Database,
  Upload,
  ChevronDown,
  Search,
  Trash2,
  ClipboardList,
  Filter,
  Pencil,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import Swal from 'sweetalert2';
import api from '../../services/api.js';
import { LabParameter, ParsedLabItem } from '../../types.js';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string | number | null;
  onChange: (val: any) => void;
  placeholder: string;
  buttonClass: string;
  disabled?: boolean;
}

function SearchableSelect({ options, value, onChange, placeholder, buttonClass, disabled = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : '';

  const filtered = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm('');
          }
        }}
        className={buttonClass}
      >
        <span className="truncate pr-2 flex-1 text-left">
          {displayLabel || placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-0 p-0 text-xs focus:outline-none focus:ring-0 text-slate-800 placeholder-slate-400"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-48 py-1">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center">Tidak ada hasil</div>
            ) : (
              filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${o.value === value ? 'bg-teal-50 font-semibold text-teal-700' : 'text-slate-700'}`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const formatTanggalIndo = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[monthIdx]} ${year}`;
      }
    }
    
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
};

export default function InputPemeriksaan() {
  const { user } = useAuthStore();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'import'|'tersimpan'>('import');

  // Parameters & loading states
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Dokter List (for DPJP dropdown)
  const [dokterList, setDokterList] = useState<any[]>([]);

  // Import State
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedLabItem[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<number|null>(null);
  const [selectedRows, setSelectedRows] = useState<{ [k: string]: boolean }>({});
  const [isParsed, setIsParsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{inserted:number;skipped:number;created_pasien:number}|null>(null);

  // Saved Records State
  const [savedRecords, setSavedRecords] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [searchSaved, setSearchSaved] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Edit States
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

  const handleOpenEditModal = (rec: any) => {
    setEditId(rec.id);
    setEditNoRegistrasi(rec.no_registrasi || '');
    setEditPasienNoRm(rec.pasien_no_rm || '');
    setEditPasienNama(rec.pasien_nama || '');
    setEditPasienNik(rec.pasien_nik || '');
    setEditDpjp(rec.dpjp || '');
    const formattedDate = rec.tanggal_pemeriksaan ? rec.tanggal_pemeriksaan.substring(0, 10) : '';
    setEditTanggalPemeriksaan(formattedDate);
    setEditParameterId(rec.parameter_id || null);
    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    if (!editNoRegistrasi.trim() || !editPasienNoRm.trim() || !editPasienNama.trim() || !editTanggalPemeriksaan.trim() || !editParameterId) {
      Swal.fire({
        title: 'Error!',
        text: 'Semua kolom bertanda bintang wajib diisi.',
        icon: 'error',
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
        dpjp: editDpjp || null,
        tanggal_pemeriksaan: editTanggalPemeriksaan
      });

      Swal.fire({
        title: 'Berhasil!',
        text: 'Data pemeriksaan berhasil diperbarui.',
        icon: 'success',
        confirmButtonColor: '#0d9488'
      });

      setIsEditing(false);
      fetchSavedRecords();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'Gagal!',
        text: err.response?.data?.message || 'Gagal memperbarui data pemeriksaan.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
    } finally {
      setUpdating(false);
    }
  };

  // Fetch saved records from new endpoint
  const fetchSavedRecords = async () => {
    setLoadingSaved(true);
    try {
      const res = await api.get('/lab/pemeriksaan');
      setSavedRecords(res.data);
    } catch (err: any) {
      console.error('Failed to fetch saved lab records', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Delete saved record handler
  const handleDeleteRecord = async (id: number, patientName: string) => {
    const result = await Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus data pemeriksaan untuk ${patientName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0d9488', // teal-600
      cancelButtonColor: '#f43f5e',  // rose-500
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/lab/pemeriksaan/${id}`);
        Swal.fire({
          title: 'Berhasil!',
          text: 'Data pemeriksaan telah berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#0d9488'
        });
        fetchSavedRecords();
      } catch (err: any) {
        console.error(err);
        Swal.fire({
          title: 'Gagal!',
          text: err.response?.data?.message || 'Gagal menghapus data pemeriksaan.',
          icon: 'error',
          confirmButtonColor: '#0d9488'
        });
      }
    }
  };

  // Date state: default to local Jakarta timezone formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Input quantities for Tab 1 (paramId -> value)
  const [quantities, setQuantities] = useState<{ [paramId: number]: string }>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch active parameters for record inputs
  const fetchActiveParameters = async () => {
    setLoadingParams(true);
    try {
      const res = await api.get('/lab/parameter');
      setParameters(res.data);
    } catch (err) {
      console.error('Failed to fetch active lab parameters', err);
    } finally {
      setLoadingParams(false);
    }
  };
  
  // Fetch Dokter List
  const fetchDokterList = async () => {
    try {
      const res = await api.get('/dokter', { params: { all: 'true' } });
      if (Array.isArray(res.data)) {
        setDokterList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch dokter list', err);
    }
  };

  // Fetch pre-existing daily lab counts for selected tanggal
  const fetchDailyData = async () => {
    if (parameters.length === 0) return;
    setLoadingData(true);
    setFeedback(null);
    try {
      const res = await api.get(`/lab/data?tanggal=${selectedDate}`);
      const dataRows: any[] = res.data;

      // Map parameter ID to quantity or empty string
      const quantityMap: { [id: number]: string } = {};
      parameters.forEach(p => {
        const match = dataRows.find(row => row.parameter_id === p.id);
        quantityMap[p.id] = match ? String(match.jumlah) : '';
      });

      setQuantities(quantityMap);
    } catch (err: any) {
      console.error('Failed to load lab data for date', err);
      setFeedback({ type: 'error', msg: 'Gagal mengunduh catatan harian: ' + err.message });
    } finally {
      setLoadingData(false);
    }
  };

  // Load initially
  useEffect(() => {
    fetchActiveParameters();
    fetchDokterList();
  }, []);

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate, parameters]);

  useEffect(() => {
    if (activeTab === 'tersimpan') {
      fetchSavedRecords();
    }
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchSaved, filterCategory]);

  // Handle number strokes
  const handleInputChange = (paramId: number, val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setQuantities(prev => ({ ...prev, [paramId]: val }));
  };

  // Save Daily input
  const handleSaveDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Format payload
    const payload = Object.entries(quantities).map(([pid, qty]) => ({
      parameter_id: Number(pid),
      jumlah: qty === '' ? 0 : Number(qty)
    }));

    try {
      await api.post('/lab/data', {
        tanggal: selectedDate,
        data: payload
      });

      const indOption: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedIndDate = new Date(selectedDate).toLocaleDateString('id-ID', indOption);

      setFeedback({ 
        type: 'success', 
        msg: `Data pengujian pemeriksaan laboratorium untuk tanggal ${formattedIndDate} berhasil disimpan.` 
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ 
        type: 'error', 
        msg: 'Gagal menyimpan data harian: ' + (err.response?.data?.message || err.message) 
      });
    } finally {
      setSaving(false);
    }
  };
  
  // PARSER LOGIC
  const parseIndoDate = (str: string) => {
    if (!str) return getTodayDateString();
    const cleanStr = str.split(' ')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return getTodayDateString();
  };

  const matchDoctor = (doctorStr: string) => {
    if (!doctorStr || doctorStr.trim() === 'N/A' || doctorStr.trim() === '') return '';
    const clean = doctorStr.trim();
    const cleanSearch = clean.replace(/^(dr\.?|drg\.?|drg\.)\s*/i, '').toLowerCase().trim();
    const exact = dokterList.find(d => d.nama_dokter.toLowerCase() === cleanSearch);
    if (exact) return exact.nama_dokter;
    // Longgar hanya jika nama cukup panjang (hindari "dr" match ke "dr X")
    if (cleanSearch.length >= 5) {
      const partial = dokterList.find(d =>
        d.nama_dokter.toLowerCase().includes(cleanSearch) ||
        cleanSearch.includes(d.nama_dokter.toLowerCase())
      );
      if (partial) return partial.nama_dokter;
    }
    return '';  // ← KUNCI: kembalikan '' agar dropdown tetap muncul
  };

  const normalizeNik = (val: string) => {
    const v = (val || '').trim();
    if (v === '0' || v === '0000000000000000' || v === '') return null;
    return v;
  };

  const triggerParser = () => {
    setFeedback(null);
    if (!rawText.trim()) {
      setFeedback({ type: 'error', msg: 'Harap tempelkan teks hasil export tabel terlebih dahulu.' });
      return;
    }

    const lines = rawText.split('\n');
    const parsed: ParsedLabItem[] = [];
    const uniqueReg = new Set();
    const selects: { [k: string]: boolean } = {};

    lines.forEach((line) => {
      let cols = line.split('\t').map(c => c.trim());
      if (cols.length < 7) cols = line.split(/\s{2,}/).map(c => c.trim());
      if (cols.length < 7) return; // skip invalid line

      // skip header
      if (cols[0].toLowerCase().includes('no') && cols[1].toLowerCase().includes('pendaftaran')) return;

      const no_registrasi = cols[1];
      if (!no_registrasi || uniqueReg.has(no_registrasi)) return; // skip duplicates in same paste

      uniqueReg.add(no_registrasi);
      const no_rm = cols[2];
      const nik = normalizeNik(cols[3]);
      const nama_pasien = cols[4];
      const dpjp = matchDoctor(cols[5]);
      const tanggal_pemeriksaan = parseIndoDate(cols[6]);

      parsed.push({ no_registrasi, no_rm, nik, nama_pasien, dpjp, tanggal_pemeriksaan });
      selects[no_registrasi] = true;
    });

    if (parsed.length === 0) {
      setFeedback({ type: 'error', msg: 'Gagal mengekstrak data. Pastikan format sesuai.' });
      return;
    }

    setParsedData(parsed);
    setSelectedRows(selects);
    setIsParsed(true);
    setImportResult(null);
  };
  
  const updateParsedDpjp = (idx: number, val: string) => {
    const newData = [...parsedData];
    newData[idx].dpjp = val;
    setParsedData(newData);
  };
  
  const handleSaveImport = async () => {
    setFeedback(null);
    if (!selectedParameter) {
      setFeedback({ type: 'error', msg: 'Anda wajib memilih Nama Pemeriksaan.' });
      return;
    }
    
    // Check missing DPJP in selected rows
    const selectedItems = parsedData.filter(r => selectedRows[r.no_registrasi]);
    const missingDpjp = selectedItems.find(r => r.dpjp === '');
    if (missingDpjp) {
      setFeedback({ type: 'error', msg: 'Masih ada baris yang terpilih tetapi belum memilih DPJP.' });
      return;
    }
    
    if (selectedItems.length === 0) {
      setFeedback({ type: 'error', msg: 'Tidak ada baris yang dipilih untuk di-import.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/lab/pemeriksaan/import', {
        parameter_id: selectedParameter,
        items: selectedItems
      });
      
      setImportResult(res.data);
      setRawText('');
      setParsedData([]);
      setIsParsed(false);
      
      setFeedback({
        type: 'success',
        msg: `Import Selesai: ${res.data.inserted} berhasil disalin. ${res.data.skipped} dilewati (duplikat/error). ${res.data.created_pasien} Pasien Baru.`
      });
      setActiveTab('tersimpan');
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Saved records derivations
  const filteredSaved = savedRecords.filter(rec => {
    const matchesSearch = 
      (rec.pasien_nama || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
      (rec.no_registrasi || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
      (rec.pasien_no_rm || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
      (rec.pasien_nik || '').toLowerCase().includes(searchSaved.toLowerCase()) ||
      (rec.nama_parameter || '').toLowerCase().includes(searchSaved.toLowerCase());
    
    const matchesCategory = filterCategory === '' || rec.kategori === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(savedRecords.map(r => r.kategori).filter(Boolean))) as string[];
  const totalPages = Math.ceil(filteredSaved.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentSavedRecords = filteredSaved.slice(indexOfFirstRecord, indexOfLastRecord);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Group active parameters by clinical category
  const categoriesMap: { [cat: string]: LabParameter[] } = {};
  parameters.forEach(p => {
    if (p.nama_parameter === '--- Parameter Awal ---') return;
    if (!categoriesMap[p.kategori]) {
      categoriesMap[p.kategori] = [];
    }
    categoriesMap[p.kategori].push(p);
  });

  const grandTotal = Object.values(quantities).reduce((sum, q) => sum + (q ? Number(q) : 0), 0);
  
  const selectedCount = Object.values(selectedRows).filter(Boolean).length;
  const missingDpjpCount = parsedData.filter(r => selectedRows[r.no_registrasi] && r.dpjp === '').length;

  return (
    <div className="space-y-4 font-sans max-w-7xl mx-auto text-xs">
      {/* Upper Title */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <span>Entri Rekapitulasi Uji Laboratorium</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Halaman import pemeriksaan sampel klinik Puri Medika per tanggal pelayanan.
          </p>
        </div>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-xl border flex items-start space-x-2 text-xs font-normal ${
            feedback.type === 'success' 
              ? 'bg-emerald-50/80 backdrop-blur-sm border-emerald-100 text-emerald-800' 
              : 'bg-rose-50/80 backdrop-blur-sm border-rose-100 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </motion.div>
      )}

      {/* Modern High-Contrast Tab Bar */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('import')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'import'
              ? 'border-teal-600 text-teal-600 border-b-2 border-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Import Pemeriksaan Lab</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tersimpan')}
          className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'tersimpan'
              ? 'border-teal-600 text-teal-600 border-b-2 border-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Data Pemeriksaan Tersimpan</span>
        </button>
      </div>

      {activeTab === 'import' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={isParsed ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" : "space-y-4"}
        >
          {/* Card Textarea Input */}
          <div className={`${isParsed ? "lg:col-span-4 lg:sticky lg:top-4" : ""} bg-white border border-slate-100/80 rounded-2xl p-5 shadow-sm space-y-3`}>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-teal-600" />
              <span>Import Tabel Pemeriksaan (Copy-Paste)</span>
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Silakan copy seluruh baris data dari halaman daftar antrean pelayanan poli (Pendaftaran, RM, NIK, Nama, Dokter, Tanggal Masuk, dll). Kolom header akan dilewati otomatis. Data yang sudah pernah dimasukkan (Duplikat Reg) akan di-skip.
            </p>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono min-h-[140px] focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
              placeholder="Paste data di sini..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={isParsed}
            />
            {!isParsed && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={triggerParser}
                  disabled={!rawText.trim()}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer text-xs flex items-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Proses & Urai Data</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Preview & Configure */}
          {isParsed && (
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white border border-slate-100/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">Pemetaan Parameter Pemeriksaan</h3>
                  <p className="text-slate-500 text-xs mt-1">Pilih jenis pemeriksaan lab untuk diterapkan ke semua baris di bawah ini.</p>
                </div>
                <div className="sm:w-1/3">
                  <SearchableSelect
                    options={parameters.map(param => ({ value: param.id, label: `${param.kategori} - ${param.nama_parameter}` }))}
                    value={selectedParameter}
                    onChange={(val) => setSelectedParameter(val ? Number(val) : null)}
                    placeholder="-- Pilih Pemeriksaan (Wajib) --"
                    buttonClass="w-full flex items-center justify-between bg-slate-50 border border-slate-200 disabled:opacity-50 text-slate-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  />
                </div>
              </div>
              
              {/* Render Preview Rows */}
              <div className="space-y-2 pb-24">
                {parsedData.map((p, idx) => {
                  const isSelected = selectedRows[p.no_registrasi];
                  const hasDpjp = p.dpjp !== '';
                  return (
                    <motion.div 
                      key={p.no_registrasi}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-white border ${isSelected ? (hasDpjp ? 'border-teal-150' : 'border-rose-200 ring-1 ring-rose-100') : 'border-slate-100 opacity-60'} rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 transition-all`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => setSelectedRows(prev => ({ ...prev, [p.no_registrasi]: e.target.checked }))}
                          className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800 text-sm">{p.nama_pasien}</h4>
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">NIK: {p.nik || '-'}</span>
                          </div>
                          <p className="text-slate-500 text-xs font-mono mt-0.5">
                            {p.no_registrasi} • RM: {p.no_rm} • {p.tanggal_pemeriksaan}
                          </p>
                        </div>
                      </div>
                      
                      <div className="sm:w-1/3 mt-2 sm:mt-0 flex flex-col">
                        {hasDpjp ? (
                          <span className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl truncate text-center">
                            DPJP: {p.dpjp}
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">DPJP Kosong (Wajib)</span>
                            <SearchableSelect
                              options={dokterList.map(d => ({ value: d.nama_dokter, label: d.nama_dokter }))}
                              value={p.dpjp}
                              onChange={(val) => updateParsedDpjp(idx, val || '')}
                              placeholder="-- Pilih Dokter DPJP --"
                              disabled={!isSelected}
                              buttonClass="w-full flex items-center justify-between bg-rose-50 border border-rose-200 disabled:opacity-50 text-rose-900 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Action Bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-4 z-10">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Total Baris Dipilih:</span>
                    <span className="text-sm font-mono font-bold text-teal-300">{selectedCount}</span>
                  </div>
                  {missingDpjpCount > 0 && (
                    <div className="flex items-center gap-2 bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-500/30">
                      <span className="text-xs text-rose-300">DPJP Kosong:</span>
                      <span className="text-sm font-mono font-bold text-rose-400">{missingDpjpCount}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsParsed(false);
                      setParsedData([]);
                      setRawText('');
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveImport}
                    disabled={submitting || missingDpjpCount > 0 || !selectedParameter || selectedCount === 0}
                    className="flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-550 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{submitting ? 'Menyimpan...' : 'Simpan Data Pemeriksaan'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Render Saved Examination Records Tab */}
      {activeTab === 'tersimpan' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filter Bar */}
          <div className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama pasien, No. Reg, RM, NIK, atau parameter..."
                  value={searchSaved}
                  onChange={(e) => setSearchSaved(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-medium text-slate-800 transition-all outline-none"
                />
              </div>

              {/* Category Filter */}
              <div className="relative w-full sm:w-64 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400 mr-2 flex-shrink-0" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold text-slate-700 focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="">Semua Kategori</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Stats or Total Count */}
            <div className="text-right flex-shrink-0 text-slate-500 text-xs font-medium">
              Menampilkan <span className="text-slate-800 font-bold font-mono">{filteredSaved.length}</span> dari <span className="text-slate-800 font-bold font-mono">{savedRecords.length}</span> rekam pemeriksaan
            </div>
          </div>

          {/* Table Container */}
          {loadingSaved ? (
            <div className="bg-white border border-slate-100/80 rounded-2xl p-12 text-center shadow-sm">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium text-slate-500">Memuat data pemeriksaan...</p>
            </div>
          ) : filteredSaved.length === 0 ? (
            <div className="bg-white border border-slate-100/80 rounded-2xl p-12 text-center shadow-sm">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700 font-sans">Data Pemeriksaan Kosong</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {searchSaved || filterCategory ? 'Tidak ditemukan data pemeriksaan yang cocok dengan filter pencarian.' : 'Belum ada data pemeriksaan lab yang tersimpan.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100/70 text-xs text-slate-500 font-semibold tracking-wider uppercase">
                      <th className="px-6 py-4.5">No. Registrasi / RM</th>
                      <th className="px-6 py-4.5">Nama Lengkap Pasien</th>
                      <th className="px-6 py-4.5">Pemeriksaan / Kategori</th>
                      <th className="px-6 py-4.5">DPJP</th>
                      <th className="px-6 py-4.5">Tanggal Pemeriksaan</th>
                      <th className="px-6 py-4.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {currentSavedRecords.map((rec, i) => (
                      <tr key={rec.id || i} className="hover:bg-slate-50/30 transition-colors">
                        {/* No. Registrasi & RM */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 font-mono text-xs">{rec.no_registrasi}</span>
                            <span className="text-slate-400 font-mono text-[11px] mt-0.5">RM: #{rec.pasien_no_rm}</span>
                          </div>
                        </td>
                        
                        {/* Nama & NIK */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 uppercase tracking-wide">{rec.pasien_nama}</span>
                            {rec.pasien_nik && (
                              <span className="text-slate-400 font-mono text-[10px] mt-0.5">NIK: {rec.pasien_nik}</span>
                            )}
                          </div>
                        </td>

                        {/* Parameter & Kategori */}
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium text-slate-800">{rec.nama_parameter}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                              {rec.kategori}
                            </span>
                          </div>
                        </td>

                        {/* DPJP */}
                        <td className="px-6 py-4.5">
                          <span className="font-medium text-slate-700">
                            {rec.dpjp || '-'}
                          </span>
                        </td>

                        {/* Tanggal */}
                        <td className="px-6 py-4.5">
                          <span className="font-medium text-slate-600">
                            {formatTanggalIndo(rec.tanggal_pemeriksaan)}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rec)}
                              className="p-2 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Edit data pemeriksaan"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(rec.id, rec.pasien_nama)}
                              className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                              title="Hapus data pemeriksaan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Halaman <span className="font-semibold text-slate-800">{currentPage}</span> dari <span className="font-semibold text-slate-800">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-teal-600 text-white'
                                : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                      }
                      return null;
                    })}
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all cursor-pointer"
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

      {/* Edit Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-xl w-full max-w-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Edit Data Pemeriksaan</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Ubah rincian pemeriksaan pasien</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* No Registrasi */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">No. Registrasi <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editNoRegistrasi}
                    onChange={(e) => setEditNoRegistrasi(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>

                {/* No RM */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">No. RM (Rekam Medis) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editPasienNoRm}
                    onChange={(e) => setEditPasienNoRm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>

                {/* Nama Pasien */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Nama Lengkap Pasien <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editPasienNama}
                    onChange={(e) => setEditPasienNama(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>

                {/* NIK */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">NIK (Nomor Induk Kependudukan)</label>
                  <input
                    type="text"
                    value={editPasienNik}
                    onChange={(e) => setEditPasienNik(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                </div>

                {/* Parameter Pemeriksaan */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Parameter Pemeriksaan <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <select
                      value={editParameterId || ''}
                      onChange={(e) => setEditParameterId(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Pilih Parameter</option>
                      {parameters.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama_parameter} ({p.kategori})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* DPJP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Dokter Penanggung Jawab (DPJP)</label>
                  <div className="relative">
                    <select
                      value={editDpjp}
                      onChange={(e) => setEditDpjp(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Pilih Dokter DPJP</option>
                      {dokterList.map((dok: any) => (
                        <option key={dok.id} value={dok.nama_dokter}>
                          {dok.nama_dokter}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Tanggal Pemeriksaan */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600">Tanggal Pemeriksaan <span className="text-rose-500">*</span></label>
                  <input
                    type="date"
                    value={editTanggalPemeriksaan}
                    onChange={(e) => setEditTanggalPemeriksaan(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
