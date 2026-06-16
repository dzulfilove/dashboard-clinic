import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  FlaskConical, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Calculator, 
  Info, 
  Settings, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Layers,
  FolderOpen,
  BriefcaseMedical,
  FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api.js';
import { LabParameter } from '../../types.js';

export default function InputPemeriksaan() {
  const { user } = useAuthStore();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'input' | 'master'>('input');

  // Filter state for category in management
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Parameters & loading states
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [allParameters, setAllParameters] = useState<LabParameter[]>([]); // Includes inactive ones
  const [loadingParams, setLoadingParams] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Date state: default to local Jakarta timezone formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Input quantities for Tab 1 (paramId -> value)
  const [quantities, setQuantities] = useState<{ [paramId: number]: string }>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Parameter modal/edit state for Tab 2
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedParamId, setSelectedParamId] = useState<number | null>(null);
  
  const [formKategori, setFormKategori] = useState('');
  const [formCustomKategori, setFormCustomKategori] = useState('');
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [formNamaParameter, setFormNamaParameter] = useState('');
  const [formIsActive, setFormIsActive] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Category creation widget inside Master Tab
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryError, setQuickCategoryError] = useState('');
  const [quickCategorySuccess, setQuickCategorySuccess] = useState('');

  // 1. Fetch active parameters for dropdown/record inputs
  const fetchActiveParameters = async () => {
    try {
      const res = await api.get('/lab/parameter');
      setParameters(res.data);
    } catch (err) {
      console.error('Failed to fetch active lab parameters', err);
    }
  };

  // 2. Fetch ALL parameters (for managing in Tab 2)
  const fetchAllParameters = async () => {
    setLoadingParams(true);
    try {
      const res = await api.get('/lab/parameter?all=true');
      setAllParameters(res.data);
    } catch (err) {
      console.error('Failed to fetch all lab parameters', err);
    } finally {
      setLoadingParams(false);
    }
  };

  // Load initially
  useEffect(() => {
    fetchActiveParameters();
    fetchAllParameters();
  }, []);

  // 3. Fetch pre-existing daily lab counts for selected tanggal
  useEffect(() => {
    async function fetchDailyData() {
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
    }

    if (activeTab === 'input') {
      fetchDailyData();
    }
  }, [selectedDate, parameters, activeTab]);

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

  // Save parameter (add/edit)
  const handleSaveParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKategori = isCustomKategori 
      ? formCustomKategori.toUpperCase().trim() 
      : formKategori.toUpperCase().trim();

    if (!finalKategori || !formNamaParameter) {
      alert('Kategori dan nama parameter tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kategori: finalKategori,
        nama_parameter: formNamaParameter.trim(),
        is_active: formIsActive
      };

      if (modalMode === 'add') {
        await api.post('/lab/parameter', payload);
      } else {
        await api.put(`/lab/parameter/${selectedParamId}`, payload);
      }

      setIsModalOpen(false);
      
      // Refresh list
      await fetchActiveParameters();
      await fetchAllParameters();

      // Clear states
      setFormNamaParameter('');
      setFormKategori('');
      setFormCustomKategori('');
      setIsCustomKategori(false);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses parameter: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Quick Category creation
  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCategoryError('');
    setQuickCategorySuccess('');
    
    const catName = quickCategoryName.toUpperCase().trim();
    if (!catName) {
      setQuickCategoryError('Nama kategori wajib diisi.');
      return;
    }

    try {
      // Direct insertion by creating a placeholder parameter in this category
      await api.post('/lab/parameter', {
        kategori: catName,
        nama_parameter: '--- Parameter Awal ---',
        is_active: 1
      });
      
      setQuickCategorySuccess(`Kelompok Kategori "${catName}" berhasil didaftarkan.`);
      setQuickCategoryName('');
      
      // Refresh list
      await fetchActiveParameters();
      await fetchAllParameters();
    } catch (err: any) {
      setQuickCategoryError(err.response?.data?.message || err.message);
    }
  };

  // Handle edit trigger
  const handleEditTrigger = (param: LabParameter) => {
    setModalMode('edit');
    setSelectedParamId(param.id);
    setFormNamaParameter(param.nama_parameter);
    setFormKategori(param.kategori);
    setFormIsActive(param.is_active);
    setIsCustomKategori(false);
    setIsModalOpen(true);
  };

  // Handle add trigger
  const handleAddTrigger = () => {
    setModalMode('add');
    setSelectedParamId(null);
    setFormNamaParameter('');
    setFormKategori(uniqueCategories[0] || 'HEMATOLOGI');
    setFormIsActive(1);
    setIsCustomKategori(false);
    setFormCustomKategori('');
    setIsModalOpen(true);
  };

  // Toggle Parameter status directly
  const handleToggleActive = async (param: LabParameter) => {
    try {
      const nextActive = param.is_active === 1 ? 0 : 1;
      await api.put(`/lab/parameter/${param.id}`, {
        kategori: param.kategori,
        nama_parameter: param.nama_parameter,
        is_active: nextActive
      });
      // Refresh state
      await fetchActiveParameters();
      await fetchAllParameters();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  // Group active parameters by clinical category
  const categoriesMap: { [cat: string]: LabParameter[] } = {};
  parameters.forEach(p => {
    // skip placeholder parameter
    if (p.nama_parameter === '--- Parameter Awal ---') return;
    if (!categoriesMap[p.kategori]) {
      categoriesMap[p.kategori] = [];
    }
    categoriesMap[p.kategori].push(p);
  });

  // Calculate unique categories listing from ALL loaded parameters
  const uniqueCategories = Array.from(
    new Set(allParameters.map(p => p.kategori))
  ).filter(Boolean);

  // Group parameter count by category for master data sidebar
  const categorySummaryMap = allParameters.reduce((acc: { [key: string]: { total: number; active: number } }, p) => {
    if (!acc[p.kategori]) {
      acc[p.kategori] = { total: 0, active: 0 };
    }
    // skip placeholder parameter from count if we want clean count
    const isPlaceholder = p.nama_parameter === '--- Parameter Awal ---';
    if (!isPlaceholder) {
      acc[p.kategori].total += 1;
      if (p.is_active === 1) {
        acc[p.kategori].active += 1;
      }
    }
    return acc;
  }, {});

  // Subtotals
  const getSubtotal = (catParams: LabParameter[]) => {
    return catParams.reduce((sum, p) => {
      const q = quantities[p.id];
      return sum + (q ? Number(q) : 0);
    }, 0);
  };

  const grandTotal = Object.values(quantities).reduce((sum, q) => sum + (q ? Number(q) : 0), 0);

  // Search filtered parameters for Tab 2
  const filteredAllParams = allParameters.filter(p => {
    const q = searchQuery.toLowerCase();
    
    // Check if it matches search input
    const matchesSearch = (p.nama_parameter || '').toLowerCase().includes(q) ||
                          (p.kategori || '').toLowerCase().includes(q);
    
    // Check if it matches category selection toggle
    const matchesCategory = selectedCategoryFilter ? p.kategori === selectedCategoryFilter : true;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 font-sans max-w-7xl mx-auto text-xs"
    >
      {/* Upper Title and Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-650" />
            <span>Rekapitulasi & Master Data Laboratorium</span>
          </h1>
          <p className="text-slate-500 mt-0.5 text-xxs font-normal">
            Entri harian hasil pengujian lab serta kelola kategori grup &amp; jenis pemeriksaan Klinik Puri Medika.
          </p>
        </div>

        {/* Tab Controls (Sleeker and smaller sizing) */}
        <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            id="tab-input-toggle"
            onClick={() => setActiveTab('input')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xxs font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'input'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ minHeight: '36px' }}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Input Hasil Harian</span>
          </button>
          <button
            id="tab-master-toggle"
            onClick={() => {
              setActiveTab('master');
              fetchAllParameters();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xxs font-medium transition-all duration-200 cursor-pointer ${
              activeTab === 'master'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ minHeight: '36px' }}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Manajemen Kategori &amp; Jenis Pemeriksaan</span>
          </button>
        </div>
      </div>

      {feedback && activeTab === 'input' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-xl border flex items-start space-x-2 text-xxs font-normal ${
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

      {/* ==================== TAB 1 STATUS: ENTRI HARIAN ==================== */}
      {activeTab === 'input' && (
        <div className="space-y-4">
          
          {/* Daily Date Selector with Today Quick Option (Compact version) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pilih Hari Pengujian</span>
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

            {/* Date Quick Controls (Small buttons) */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className="text-xxs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100/50 transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = new Date(selectedDate);
                  current.setDate(current.getDate() - 1);
                  setSelectedDate(current.toISOString().slice(0, 10));
                }}
                className="text-xxs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60 transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => {
                  const current = new Date(selectedDate);
                  current.setDate(current.getDate() + 1);
                  setSelectedDate(current.toISOString().slice(0, 10));
                }}
                className="text-xxs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60 transition-colors cursor-pointer"
                style={{ minHeight: '32px' }}
              >
                Besok
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 p-16 text-center text-slate-500">
              <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
              <span className="font-normal text-slate-705">Mengambil catatan laboratorium harian...</span>
            </div>
          ) : parameters.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <FlaskConical className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-800">Daftar Parameter Lab Belum Terdaftar</h3>
              <p className="text-xxs text-slate-500 mt-1 max-w-xs mx-auto">
                Silakan daftar kategori beserta jenis pemeriksaan klinis di tab <strong>Manajemen Kategori &amp; Jenis Pemeriksaan</strong>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSaveDaily} className="space-y-4">
              
              {/* Category Grid Section - Compact Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(categoriesMap).map(([category, catParams]) => (
                  <div 
                    key={category} 
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      <div className="bg-slate-50/50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-xxs">
                          {category}
                        </span>
                        <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 font-mono">
                          {catParams.length} Jenis Pemeriksaan
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100/50 px-4">
                        {catParams.map(param => (
                          <div key={param.id} className="py-2 flex items-center justify-between gap-3">
                            <label htmlFor={`param-${param.id}`} className="text-xxs font-normal text-slate-600 leading-tight cursor-pointer flex-1">
                              {param.nama_parameter}
                            </label>
                            <input
                              id={`param-${param.id}`}
                              type="text"
                              inputMode="numeric"
                              value={quantities[param.id] || ''}
                              onChange={(e) => handleInputChange(param.id, e.target.value)}
                              placeholder="0"
                              className="bg-slate-50 border border-slate-200 rounded-lg text-slate-900 px-2 py-1 text-center text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 w-20 transition-all"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="bg-slate-50/20 py-2 px-4 border-t border-slate-100/50 flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-400">Subtotal {category}</span>
                      <span className="font-semibold text-slate-700 font-mono bg-slate-100/60 px-2 py-0.5 rounded border border-slate-200/40">
                        {getSubtotal(catParams)} pengujian
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total bottom accumulation bar - super neat and smaller */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-teal-600 rounded-xl text-white flex-shrink-0">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block">Total Akumulasi Harian ({selectedDate})</span>
                    <h3 className="text-sm font-semibold text-teal-300 font-mono mt-0.5">
                      {grandTotal} <span className="text-xxs text-slate-400 font-sans font-normal">Pemeriksaan Laboratorium</span>
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="save-daily-btn"
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-550 text-white font-medium py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer text-xxs"
                    style={{ minHeight: '36px' }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Transaksi Harian'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ==================== TAB 2 STATUS: MANAJEMEN KATEGORI & JENIS PEMERIKSAAN ==================== */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          
          {/* Informational Guidelines on Categories and Exam Types Mapping */}
          <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-4 flex items-start space-x-3">
            <Info className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-teal-900 text-xs">Informasi Struktur Penomoran Kategori &amp; Jenis Pemeriksaan (Parameters)</h4>
              <p className="text-teal-700 font-normal leading-relaxed text-xxs">
                Data Lab Klinik diatur secara bertingkat: <strong>Kelompok Kategori</strong> mendefinisikan laboratorium klinis spesifik (seperti HEMATOLOGI, KIMIA DARAH, URINALISIS), sedangkan 
                setiap <strong>Jenis Pemeriksaan (Parameter)</strong> merupakan detail pengetesan individual yang dianalisa per harinya.
              </p>
            </div>
          </div>

          {/* SPLIT LAYOUT FOR ADVANCED CATEGORY AND PARAMETERS CONTROL */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            
            {/* LEFT COLUMN: CATEGORIES MANAGEMENT DIRECTORY */}
            <div className="lg:col-span-1 space-y-4">
              
              {/* Category Directory Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <span className="font-semibold text-slate-800 flex items-center gap-1 text-xxs tracking-wider uppercase">
                    <Layers className="h-3.5 w-3.5 text-teal-600" />
                    <span>Grup Kategori ({uniqueCategories.length})</span>
                  </span>
                </div>

                {/* Categories Filter Pills Column */}
                <div className="space-y-1">
                  <button
                    id="filter-category-all"
                    onClick={() => setSelectedCategoryFilter(null)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xxs font-medium transition-all ${
                      selectedCategoryFilter === null
                        ? 'bg-teal-50 text-teal-700 font-semibold border border-teal-100/50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                    style={{ minHeight: '36px' }}
                  >
                    <span className="flex items-center gap-1.5">
                      <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>Semua Pemeriksaan</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-mono">
                      {allParameters.filter(p => p.nama_parameter !== '--- Parameter Awal ---').length}
                    </span>
                  </button>

                  {uniqueCategories.map(cat => {
                    const stats = categorySummaryMap[cat] || { total: 0, active: 0 };
                    return (
                      <button
                        key={cat}
                        id={`filter-category-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xxs font-medium transition-all ${
                          selectedCategoryFilter === cat
                            ? 'bg-teal-50 text-teal-700 font-semibold border border-teal-100/50'
                             : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                        }`}
                        style={{ minHeight: '36px' }}
                      >
                        <span className="truncate flex items-center gap-1.5 text-left">
                          <span className={`h-1.5 w-1.5 rounded-full ${stats.active > 0 ? 'bg-teal-500' : 'bg-slate-350'}`}></span>
                          <span className="truncate uppercase">{cat}</span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-mono flex items-center gap-0.5">
                          <span>{stats.active}</span>
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-400">{stats.total}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick "Add Category" Form - Highly Request Solution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-xxs tracking-wider uppercase pb-2 border-b border-slate-100 mb-2.5">
                  <FolderPlus className="h-3.5 w-3.5 text-slate-400" />
                  <span>Tambah Kategori Kelompok</span>
                </span>
                
                <form onSubmit={handleQuickCreateCategory} className="space-y-2">
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Daftar kelompok kategori klinis baru, misalnya: IMPLANTASI, ELEKTROLIT, PARASITOLOGI.
                  </p>
                  <div>
                    <input
                      id="quick-cat-name-input"
                      type="text"
                      placeholder="Nama Kategori (kapital)"
                      required
                      value={quickCategoryName}
                      onChange={(e) => setQuickCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xxs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                      style={{ minHeight: '32px' }}
                    />
                  </div>

                  {quickCategoryError && (
                    <div className="text-[9px] text-rose-600 font-normal bg-rose-50 p-1.5 rounded border border-rose-100">
                      {quickCategoryError}
                    </div>
                  )}

                  {quickCategorySuccess && (
                    <div className="text-[9px] text-emerald-600 font-normal bg-emerald-50 p-1.5 rounded border border-emerald-100">
                      {quickCategorySuccess}
                    </div>
                  )}

                  <button
                    id="submit-quick-cat-btn"
                    type="submit"
                    className="w-full flex items-center justify-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 px-3 rounded-lg text-[10px] cursor-pointer transition-colors"
                    style={{ minHeight: '32px' }}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Daftarkan Kelompok</span>
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: SEARCH, ACTIONS AND PARAMETERS LIST TABLE */}
            <div className="lg:col-span-3 space-y-4">
              
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3">
                
                {/* Search & Action Panel Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Search box icon input */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      id="search-params"
                      type="text"
                      placeholder="Cari jenis pemeriksaan atau parameter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xxs text-slate-808 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 font-normal"
                      style={{ minHeight: '36px' }}
                    />
                  </div>

                  {/* Add parameter type trigger */}
                  <div className="flex items-center gap-1.5">
                    {selectedCategoryFilter && (
                      <button
                        onClick={() => setSelectedCategoryFilter(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium text-slate-655 text-xxs flex items-center gap-1 cursor-pointer"
                        style={{ minHeight: '36px' }}
                      >
                        Reset Filter
                      </button>
                    )}
                    <button
                      id="btn-add-parameter"
                      onClick={handleAddTrigger}
                      className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-555 text-white font-medium px-3.5 py-2 rounded-xl text-xxs shadow-xs transition-colors cursor-pointer"
                      style={{ minHeight: '36px' }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Jenis Pemeriksaan</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle count indicator */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1.5">
                  <span>Daftar Parameter {selectedCategoryFilter && `Kategori "${selectedCategoryFilter}"`}</span>
                  <span>Menampilkan {filteredAllParams.length} parameter</span>
                </div>

                {/* Grid list or parameter sheet */}
                {loadingParams ? (
                  <div className="text-center py-12 text-slate-400">
                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mx-auto mb-2" />
                    <span>Sinkronisasi database master...</span>
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xxs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200/60 font-semibold text-slate-700">
                            <th className="px-3.5 py-2.5 w-10">No</th>
                            <th className="px-3.5 py-2.5">Kelompok Kategori</th>
                            <th className="px-3.5 py-2.5">Nama Jenis Pemeriksaan (Parameter)</th>
                            <th className="px-3.5 py-2.5 text-center w-24">Status</th>
                            <th className="px-3.5 py-2.5 text-right w-24">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAllParams.length > 0 ? (
                            filteredAllParams.map((param, index) => {
                              const isPlaceholder = param.nama_parameter === '--- Parameter Awal ---';
                              return (
                                <tr key={param.id} className={`hover:bg-slate-55/40 transition-colors ${isPlaceholder ? 'bg-slate-50/50 text-slate-450' : ''}`}>
                                  <td className="px-3.5 py-2 font-mono text-slate-400">{index + 1}</td>
                                  <td className="px-3.5 py-2">
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold uppercase tracking-wider font-mono text-[9px]">
                                      {param.kategori}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2 font-medium">
                                    <span className={`${isPlaceholder ? 'italic text-slate-400' : 'text-slate-800'}`}>
                                      {param.nama_parameter}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2 text-center">
                                    <button
                                      id={`toggle-active-${param.id}`}
                                      onClick={() => handleToggleActive(param)}
                                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[9px] font-semibold border cursor-pointer transition-colors ${
                                        param.is_active === 1
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                          : 'bg-slate-100 text-slate-500 border-slate-200'
                                      }`}
                                      disabled={isPlaceholder}
                                    >
                                      <span className={`h-1 w-1 rounded-full ${param.is_active === 1 ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
                                      <span>{param.is_active === 1 ? 'AKTIF' : 'INAKTIF'}</span>
                                    </button>
                                  </td>
                                  <td className="px-3.5 py-2 text-right">
                                    <div className="inline-flex space-x-1">
                                      <button
                                        id={`edit-param-${param.id}`}
                                        onClick={() => handleEditTrigger(param)}
                                        className="p-1 px-1.5 text-[10px] text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                        title="Ubah Detail"
                                        disabled={isPlaceholder}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        id={`deact-param-${param.id}`}
                                        onClick={() => handleToggleActive(param)}
                                        className={`p-1 px-1.5 rounded-lg transition-colors cursor-pointer ${
                                          param.is_active === 1 
                                            ? 'text-rose-600 hover:bg-rose-50' 
                                            : 'text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                        title={param.is_active === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                                        disabled={isPlaceholder}
                                      >
                                        {param.is_active === 1 ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                                Tidak ada jenis pemeriksaan yang terdaftar untuk filter ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==================== ADAPTIVE CREATE/EDIT PARAMETER MODAL DIALOG ==================== */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto font-sans text-xs">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Body */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xxs font-extrabold text-slate-900 tracking-tight uppercase flex items-center gap-1.5">
                    <BriefcaseMedical className="h-4 w-4 text-teal-650" />
                    <span>{modalMode === 'add' ? 'Tambah Jenis Pemeriksaan' : 'Ubah Detail Pemeriksaan'}</span>
                  </h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 text-slate-450 hover:text-slate-650 rounded text-xxs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleSaveParameter} className="p-4 space-y-4">
                  {/* Category Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pilih Kategori Kelompok
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomKategori(!isCustomKategori);
                          setFormKategori(uniqueCategories[0] || 'HEMATOLOGI');
                          setFormCustomKategori('');
                        }}
                        className="text-[10px] font-bold text-teal-650 hover:text-teal-750 flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{isCustomKategori ? 'Grup Eksis' : 'Kategori Baru'}</span>
                      </button>
                    </div>

                    {!isCustomKategori ? (
                      <select
                        id="modal-category-select"
                        value={formKategori}
                        onChange={(e) => setFormKategori(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xxs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                        style={{ minHeight: '36px' }}
                      >
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="modal-category-input"
                        type="text"
                        placeholder="Contoh: HISTOPATOLOGI"
                        value={formCustomKategori}
                        onChange={(e) => setFormCustomKategori(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xxs font-normal placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                        style={{ minHeight: '36px' }}
                      />
                    )}
                  </div>

                  {/* Parameter Name */}
                  <div className="space-y-1">
                    <label htmlFor="modal-param-name" className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                      Nama Pemeriksaan (Parameter)
                    </label>
                    <input
                      id="modal-param-name"
                      type="text"
                      placeholder="Contoh: Darah Lengkap, Glukosa, Asam Urat"
                      value={formNamaParameter}
                      onChange={(e) => setFormNamaParameter(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xxs font-normal placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                      required
                      style={{ minHeight: '36px' }}
                    />
                  </div>

                  {/* Active status dropdown */}
                  {modalMode === 'edit' && (
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xxs font-medium text-slate-700 block">Status Keaktifan</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Tampilkan parameter di input harian</span>
                      </div>
                      <select
                        id="modal-param-active"
                        value={formIsActive}
                        onChange={(e) => setFormIsActive(Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-700 cursor-pointer"
                        style={{ minHeight: '32px' }}
                      >
                        <option value={1}>Aktif</option>
                        <option value={0}>Inaktif</option>
                      </select>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium px-4 py-2 rounded-lg cursor-pointer text-xxs"
                      style={{ minHeight: '32px' }}
                    >
                      Batal
                    </button>
                    <button
                      id="modal-save-btn"
                      type="submit"
                      disabled={saving}
                      className="bg-teal-650 hover:bg-teal-600 text-white font-medium px-4 py-2 rounded-lg shadow-xs cursor-pointer text-xxs flex items-center space-x-1"
                      style={{ minHeight: '32px' }}
                    >
                      <Save className="h-3 w-3" />
                      <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
