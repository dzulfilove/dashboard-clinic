import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore.js';
import { 
  FlaskConical, 
  Save, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Layers,
  FolderOpen,
  BriefcaseMedical,
  FolderPlus,
  AlertCircle,
  CheckCircle,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../../services/api.js';
import { LabParameter } from '../../types.js';

export default function MasterPemeriksaan() {
  const { user } = useAuthStore();

  // Filter state for category in management
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Parameters & loading states
  const [allParameters, setAllParameters] = useState<LabParameter[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);
  const [saving, setSaving] = useState(false);

  // CSV Import States
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [hoverDrag, setHoverDrag] = useState(false);

  // Parameter modal/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedParamId, setSelectedParamId] = useState<number | null>(null);
  
  const [formKategori, setFormKategori] = useState('');
  const [formCustomKategori, setFormCustomKategori] = useState('');
  const [isCustomKategori, setIsCustomKategori] = useState(false);
  const [formNamaParameter, setFormNamaParameter] = useState('');
  const [formIsActive, setFormIsActive] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Category creation widget
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [quickCategoryError, setQuickCategoryError] = useState('');
  const [quickCategorySuccess, setQuickCategorySuccess] = useState('');

  // Client-side parser for CSV data
  const parseCSVTextForPemeriksaan = (text: string): any[] => {
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes(';')) {
      separator = ';';
    } else if (firstLine.includes('\t')) {
      separator = '\t';
    }

    const headers = firstLine.split(separator).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    let kategoriIdx = -1;
    let namaIdx = -1;

    headers.forEach((h, idx) => {
      if (h.includes('kategori') || h.includes('category') || h.includes('kelompok')) {
        kategoriIdx = idx;
      } else if (h.includes('nama') || h.includes('parameter') || h.includes('pemeriksaan') || h.includes('test')) {
        namaIdx = idx;
      }
    });

    // Fallback if no clean match found: first col is kategori, second is nama_parameter
    if (kategoriIdx === -1) kategoriIdx = 0;
    if (namaIdx === -1) namaIdx = headers.length > 1 ? 1 : 0;

    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
       const cells = lines[i].split(separator).map(c => c.replace(/^["']|["']$/g, '').trim());
       if (cells.length === 0) continue;

       const kategori = cells[kategoriIdx];
       const nama_parameter = cells[namaIdx];
       if (!kategori || !nama_parameter) continue;

       items.push({
         kategori: kategori.toUpperCase().trim(),
         nama_parameter: nama_parameter.trim()
       });
    }

    return items;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setHoverDrag(true);
  };

  const handleDragLeave = () => {
    setHoverDrag(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHoverDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVImportFile(e.dataTransfer.files[0]);
    }
  };

  const handleCSVImportFile = async (file: File) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();
    if (!nameLower.endsWith('.csv')) {
      setImportFeedback({ type: 'error', msg: 'Harap unggah file CSV (.csv).' });
      return;
    }

    try {
      setImporting(true);
      setImportFeedback(null);
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = async () => {
        const csvText = reader.result as string;
        try {
          const items = parseCSVTextForPemeriksaan(csvText);
          if (items.length === 0) {
            setImportFeedback({ type: 'error', msg: 'File CSV kosong atau format tidak sesuai.' });
            return;
          }
          const res = await api.post('/lab/parameter/import-bulk', { items });
          setImportFeedback({ type: 'success', msg: res.data.message || 'Sukses mengimpor data pemeriksaan.' });
          await fetchAllParameters();
        } catch (err: any) {
          console.error(err);
          setImportFeedback({ 
            type: 'error', 
            msg: 'Gagal mengimpor data: ' + (err.response?.data?.message || err.message) 
          });
        } finally {
          setImporting(false);
        }
      };
      
      reader.onerror = () => {
        setImporting(false);
        setImportFeedback({ type: 'error', msg: 'Gagal membaca file.' });
      };
    } catch (err: any) {
      console.error(err);
      setImporting(false);
      setImportFeedback({ type: 'error', msg: 'Terjadi kesalahan: ' + err.message });
    }
  };

  const handleDownloadTemplateCSV = async () => {
    try {
      const response = await api.get('/lab/parameter/template-csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'template_master_pemeriksaan.csv';
      link.click();
    } catch (err) {
      Swal.fire({
        title: 'Unduh Gagal',
        text: 'Gagal mengunduh template CSV. Silakan coba lagi.',
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
      console.error('Failed to download lab parameter template csv', err);
    }
  };

  // Fetch all parameters
  const fetchAllParameters = async () => {
    setLoadingParams(true);
    try {
      const res = await api.get('/lab/parameter?all=true');
      setAllParameters(res.data);
    } catch (err) {
      console.error('Failed to fetch lab parameters', err);
    } finally {
      setLoadingParams(false);
    }
  };

  useEffect(() => {
    fetchAllParameters();
  }, []);

  // Save parameter (add/edit)
  const handleSaveParameter = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalKategori = isCustomKategori 
      ? formCustomKategori.toUpperCase().trim() 
      : formKategori.toUpperCase().trim();

    if (!finalKategori || !formNamaParameter) {
      Swal.fire({
        title: 'Validasi Gagal',
        text: 'Kategori dan nama parameter tidak boleh kosong.',
        icon: 'warning',
        confirmButtonColor: '#0d9488'
      });
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
      await fetchAllParameters();

      // Clear states
      setFormNamaParameter('');
      setFormKategori('');
      setFormCustomKategori('');
      setIsCustomKategori(false);
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        title: 'Gagal',
        text: 'Gagal memproses parameter: ' + (err.response?.data?.message || err.message),
        icon: 'error',
        confirmButtonColor: '#0d9488'
      });
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
      setQuickCategoryError('Nama kelompok kategori wajib diisi.');
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
      await fetchAllParameters();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  // Calculate unique categories listing
  const uniqueCategories = Array.from(
    new Set(allParameters.map(p => p.kategori))
  ).filter(Boolean);

  // Group parameter count by category
  const categorySummaryMap = allParameters.reduce((acc: { [key: string]: { total: number; active: number } }, p) => {
    if (!acc[p.kategori]) {
      acc[p.kategori] = { total: 0, active: 0 };
    }
    const isPlaceholder = p.nama_parameter === '--- Parameter Awal ---';
    if (!isPlaceholder) {
      acc[p.kategori].total += 1;
      if (p.is_active === 1) {
        acc[p.kategori].active += 1;
      }
    }
    return acc;
  }, {});

  // For active parameter groups
  const activeCategoriesCount = Object.keys(categorySummaryMap).length;
  const totalParametersCount = allParameters.filter(p => p.nama_parameter !== '--- Parameter Awal ---').length;
  const activeParametersCount = allParameters.filter(p => p.nama_parameter !== '--- Parameter Awal ---' && p.is_active === 1).length;

  // Search filtered parameters
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
      className="space-y-5 font-sans max-w-7xl mx-auto text-xs"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <span>Master Data Pemeriksaan Laboratorium</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Kelola pengelompokan kategori klinis and daftar jenis pengujian laboratorium Klinik Puri Medika.
          </p>
        </div>
        <button
          id="btn-add-pemeriksaan"
          onClick={handleAddTrigger}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-xxs inline-flex items-center gap-1.5 self-start sm:self-center"
          style={{ minHeight: '36px' }}
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Parameter Baru</span>
        </button>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Kategori</span>
            <span className="text-lg font-bold text-slate-800 block leading-tight mt-0.5">{activeCategoriesCount} Kelompok</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl">
            <BriefcaseMedical className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Jenis Pemeriksaan (Aktif)</span>
            <span className="text-lg font-bold text-slate-800 block leading-tight mt-0.5">{activeParametersCount} / {totalParametersCount} Item</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="p-2.5 bg-slate-50 text-slate-700 rounded-xl">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Pembaruan DB Terakhir</span>
            <span className="text-xs font-semibold text-slate-600 block leading-tight mt-0.5">Sinkronisasi Realtime</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Directory / Creator, Right Side List table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Side: Directory Controls */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* 1. Quick Category Creator Widget */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4">
            <h2 className="text-xxs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <FolderPlus className="h-4 w-4 text-emerald-600" />
              <span>Registrasi Kelompok Baru</span>
            </h2>
            
            <form onSubmit={handleQuickCreateCategory} className="space-y-2.5">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Daftarkan kelompok uji klinis baru directly ke database dalam sekejap.
              </p>
              
              <div className="flex gap-2">
                <input
                  id="quick-cat-name"
                  type="text"
                  placeholder="Contoh: HISTOPATOLOGI"
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none text-xxs font-semibold uppercase tracking-wider text-slate-850 placeholder-slate-400 flex-1"
                  style={{ minHeight: '34px' }}
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 rounded-lg text-xxs transition-colors flex items-center justify-center cursor-pointer min-h-[34px]"
                >
                  Daftar
                </button>
              </div>

              {quickCategoryError && (
                <p id="quick-cat-error" className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 mt-1">
                  ✕ {quickCategoryError}
                </p>
              )}
              {quickCategorySuccess && (
                <p id="quick-cat-success" className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-2 mt-1">
                  ✓ {quickCategorySuccess}
                </p>
              )}
            </form>
          </div>

          {/* 1b. CSV Data Import Card */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4">
            <h2 className="text-xxs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UploadCloud className="h-4 w-4 text-teal-600" />
                <span>Import CSV Pemeriksaan</span>
              </span>
              <button 
                onClick={handleDownloadTemplateCSV}
                className="text-[9px] hover:underline text-teal-600 font-extrabold cursor-pointer"
              >
                Unduh Template
              </button>
            </h2>
            
            <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
              Impor parameter pemeriksaan sekaligus dengan mengunggah file format CSV (.csv).
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                hoverDrag 
                  ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/55'
              }`}
            >
              <input
                id="csv-file-picker"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCSVImportFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="csv-file-picker" className="cursor-pointer block">
                {importing ? (
                  <div className="flex flex-col items-center justify-center py-2.5">
                    <RefreshCw className="h-6 w-6 text-teal-600 animate-spin mb-1.5" />
                    <span className="text-xxs font-bold text-slate-700">Memproses Berkas...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-1">
                    <UploadCloud className="h-7 w-7 text-slate-400 mb-1.5" />
                    <span className="text-xxs font-bold text-slate-800">
                      Tarik & Lepas berkas di sini
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      atau <span className="text-teal-600 underline">pilih dari file explorer</span>
                    </span>
                  </div>
                )}
              </label>
            </div>

            {importFeedback && (
              <div className={`mt-3 p-2.5 rounded-xl border flex items-start gap-2 ${
                importFeedback.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                {importFeedback.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span className="text-[10px] font-semibold leading-normal flex-1">
                  {importFeedback.msg}
                </span>
                <button 
                  onClick={() => setImportFeedback(null)} 
                  className="text-slate-400 hover:text-slate-600 shrink-0 self-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* 2. Category Sidebar List Picker */}
          <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
              <h2 className="text-xxs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-sky-650" />
                <span>Direktori Kelompok Klinis</span>
              </h2>
              {selectedCategoryFilter && (
                <button
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-[9px] font-extrabold text-teal-600 hover:text-teal-800 cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              <button
                id="filter-category-all"
                onClick={() => setSelectedCategoryFilter(null)}
                className={`w-full text-left px-2.5 py-2 rounded-xl font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  selectedCategoryFilter === null 
                    ? 'bg-teal-50 text-teal-800' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={{ minHeight: '34px' }}
              >
                <span>Semua Jenis Pemeriksaan</span>
                <span className="bg-slate-200/60 font-mono text-[9px] text-slate-700 px-1.5 py-0.5 rounded-lg">
                  {totalParametersCount}
                </span>
              </button>

              {uniqueCategories.map(cat => {
                const isSelected = selectedCategoryFilter === cat;
                const counts = categorySummaryMap[cat] || { total: 0, active: 0 };
                return (
                  <button
                    key={cat}
                    id={`filter-category-${cat}`}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 text-slate-100 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    style={{ minHeight: '34px' }}
                  >
                    <span className="truncate">{cat}</span>
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-lg ${isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-650'}`}>
                      {counts.active}/{counts.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Side: Tabular Parameter Directory & Search */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-55/40 p-1 rounded-xl">
            {/* Search Bar Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-param-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jenis pemeriksaan atau nama kategori..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xxs font-normal placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                style={{ minHeight: '36px' }}
              />
            </div>
            
            <div className="text-[10px] font-semibold text-slate-500 px-2">
              <span>Menampilkan {filteredAllParams.length} parameter</span>
            </div>
          </div>

          {/* Database Grid List or parameters table */}
          {loadingParams ? (
            <div className="text-center py-16 text-slate-400">
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
                          <tr key={param.id} className={`hover:bg-slate-50/50 transition-colors ${isPlaceholder ? 'bg-slate-50/50 text-slate-450' : ''}`}>
                            <td className="px-3.5 py-2 font-mono text-slate-400">{index + 1}</td>
                            <td className="px-3.5 py-2">
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold uppercase tracking-wider font-mono text-[9px]">
                                {param.kategori}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 font-medium">
                              <span className={`${isPlaceholder ? 'italic text-slate-450' : 'text-slate-800'}`}>
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
                                      ? 'text-rose-650 hover:bg-rose-50' 
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
                        <td colSpan={5} className="px-3 py-10 text-center text-slate-400 font-medium">
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

      {/* ADAPTIVE CREATE/EDIT PARAMETER MODAL DIALOG */}
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
                    <BriefcaseMedical className="h-4 w-4 text-teal-600" />
                    <span>{modalMode === 'add' ? 'Tambah Jenis Pemeriksaan' : 'Ubah Detail Pemeriksaan'}</span>
                  </h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded text-xxs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Form fields */}
                <form onSubmit={handleSaveParameter} className="p-4 space-y-4">
                  {/* Category Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">
                        Pilih Kategori Kelompok
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomKategori(!isCustomKategori);
                          setFormKategori(uniqueCategories[0] || 'HEMATOLOGI');
                          setFormCustomKategori('');
                        }}
                        className="text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5 cursor-pointer"
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
                    <label htmlFor="modal-param-name" className="text-[10px] font-medium uppercase tracking-wider text-slate-450 block">
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
                      className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg shadow-xs cursor-pointer text-xxs flex items-center space-x-1"
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
