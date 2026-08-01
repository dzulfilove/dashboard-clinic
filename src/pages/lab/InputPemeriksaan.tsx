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
  Search
} from 'lucide-react';
import { motion } from 'motion/react';
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

export default function InputPemeriksaan() {
  const { user } = useAuthStore();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'harian'|'import'>('harian');

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
      
      setActiveTab('harian');
      fetchDailyData(); // Refresh daily input form
      
      setFeedback({
        type: 'success',
        msg: `Import Selesai: ${res.data.inserted} berhasil disalin. ${res.data.skipped} dilewati (duplikat/error). ${res.data.created_pasien} Pasien Baru.`
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
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
            Halaman pencatatan kuantitas harian & import pemeriksaan sampel klinik Puri Medika per tanggal pelayanan.
          </p>
        </div>
      </div>
      
      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-max shadow-sm border border-slate-200/50">
        <button
          onClick={() => { setActiveTab('harian'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center space-x-2 ${activeTab === 'harian' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 border border-transparent'}`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Input Harian</span>
        </button>
        <button
          onClick={() => { setActiveTab('import'); setFeedback(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center space-x-2 ${activeTab === 'import' ? 'bg-white text-teal-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 border border-transparent'}`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Import Pemeriksaan</span>
        </button>
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

      {activeTab === 'harian' && (
        <div className="space-y-4">
          {/* Daily Date Selector with Today Quick Option */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-100/80 rounded-2xl shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Pilih Hari Pengujian</span>
                <input
                  id="daily-date-picker"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-slate-900 border-none bg-transparent focus:outline-none focus:ring-0 outline-none cursor-pointer mt-0.5"
                  style={{ minHeight: '32px' }}
                />
              </div>
            </div>

            {/* Date Quick Controls */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className="text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100/50 transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(selectedDate);
                  prev.setDate(prev.getDate() - 1);
                  setSelectedDate(prev.toISOString().slice(0, 10));
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-medium text-slate-600 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                ◀ Kemarin
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(selectedDate);
                  next.setDate(next.getDate() + 1);
                  setSelectedDate(next.toISOString().slice(0, 10));
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-medium text-slate-600 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                Besok ▶
              </button>
            </div>
          </motion.div>

          {/* LOADING PROGRESS AND PARAMETERS DRAW */}
          {loadingParams || loadingData ? (
            <div className="bg-white border border-slate-100/80 rounded-2xl p-16 text-center text-slate-400 font-medium font-sans shadow-sm">
              <RefreshCw className="h-6 w-6 text-teal-650 animate-spin mx-auto mb-2" />
              <span>Sinkronisasi antarmuka dan data lab harian...</span>
            </div>
          ) : (
            <form onSubmit={handleSaveDaily} className="space-y-4">
              
              {/* Grid of clinical categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(categoriesMap).length > 0 ? (
                  Object.entries(categoriesMap).map(([category, params], i) => (
                    <motion.div 
                      key={category} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.16 + (i * 0.05) }}
                      className="bg-white border border-slate-100/80 rounded-2xl p-4 shadow-sm space-y-3"
                    >
                      <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 rounded-lg font-semibold uppercase tracking-wider font-mono text-xs border border-teal-100">
                        {category}
                      </span>
                      
                      <div className="divide-y divide-slate-100">
                        {params.map(p => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-3">
                            <label htmlFor={`qty-${p.id}`} className="text-slate-700 font-medium hover:text-slate-900 cursor-pointer text-xs flex-1 truncate">
                              {p.nama_parameter}
                            </label>
                            <input
                              id={`qty-${p.id}`}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={quantities[p.id] || ''}
                              onChange={(e) => handleInputChange(p.id, e.target.value)}
                              className="bg-slate-50 border border-slate-200/70 rounded-xl text-center w-16 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white focus:border-teal-300"
                              style={{ height: '28px' }}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                    Belum ada parameter pemeriksaan aktif. Silakan masuk ke submenu Master Pemeriksaan untuk mendaftarkan kategori uji klinis.
                  </div>
                )}
              </div>

              {/* Total bottom accumulation bar */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-teal-600 rounded-xl text-white flex-shrink-0">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs uppercase font-medium tracking-wider text-slate-400 block">Total Akumulasi Harian ({selectedDate})</span>
                    <h3 className="text-sm font-semibold text-teal-300 font-mono mt-0.5">
                      {grandTotal} <span className="text-xs text-slate-400 font-sans font-normal">Pemeriksaan Laboratorium</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="save-daily-btn"
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-550 text-white font-medium py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
                    style={{ minHeight: '36px' }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Transaksi Harian'}</span>
                  </button>
                </div>
              </motion.div>
            </form>
          )}
        </div>
      )}
      
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

    </div>
  );
}
