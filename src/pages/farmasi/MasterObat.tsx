import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore.js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Package, 
  Search, 
  Plus, 
  Edit2, 
  Ban, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Truck, 
  Layers, 
  Save, 
  X,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api.js';
import { ObatMaster } from '../../types.js';
import { motion, AnimatePresence } from 'motion/react';

export default function MasterObat() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const { data: resData, isLoading: loading } = useQuery<{ data: ObatMaster[]; pagination: any }>({
    queryKey: ['obat-master', searchQuery, currentPage],
    queryFn: async () => {
      try {
        const res = await api.get('/obat/master', {
          params: { q: searchQuery, page: currentPage, limit: 50 }
        });
        return res.data;
      } catch (err: any) {
        console.error('Failed to load medicines list', err);
        setFeedback({ type: 'error', msg: 'Gagal mendownload data master obat dari server.' });
        throw err;
      }
    },
  });

  const medicines = resData?.data || [];
  const pagination = resData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  const [selectedGolongan, setSelectedGolongan] = useState('Semua');

  // Form states (Add/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [kodeObat, setKodeObat] = useState('');
  const [namaObat, setNamaObat] = useState('');
  const [golongan, setGolongan] = useState('');
  const [satuan, setSatuan] = useState('');
  const [kemasan, setKemasan] = useState('');
  const [hargaSatuan, setHargaSatuan] = useState('');
  const [leadTime, setLeadTime] = useState('2');
  const [safetyStock, setSafetyStock] = useState('0');
  const [stokMinimum, setStokMinimum] = useState('0');
  const [reorderPoint, setReorderPoint] = useState('0');
  const [isActive, setIsActive] = useState(1);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Import states
  const [importing, setImporting] = useState(false);
  const [hoverDrag, setHoverDrag] = useState(false);
  const [importTab, setImportTab] = useState<'excel' | 'csv' | 'paste'>('excel');
  const [pastedText, setPastedText] = useState('');

  // Client-side parser for CSV or TSV pasted data
  const parseCSVOrTabDelimitedText = (text: string): any[] => {
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    let separator = '\t';
    if (firstLine.includes('\t')) {
      separator = '\t';
    } else if (firstLine.includes(';')) {
      separator = ';';
    } else if (firstLine.includes(',')) {
      separator = ',';
    }

    const headers = firstLine.split(separator).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
    
    const colMap: { [key: string]: number } = {};
    headers.forEach((h, idx) => {
      if (h.includes('kode')) colMap['kode'] = idx;
      else if (h.includes('nama') || h.includes('oba')) colMap['nama'] = idx;
      else if (h.includes('satuan')) colMap['satuan'] = idx;
      else if (h.includes('kemasan')) colMap['kemasan'] = idx;
      else if (h.includes('harga')) colMap['harga'] = idx;
      else if (h.includes('safety') || h.includes('stok aman')) colMap['safety'] = idx;
      else if (h.includes('lead')) colMap['lead'] = idx;
      else if (h.includes('minimum') || h.includes('stok min')) colMap['minimum'] = idx;
      else if (h.includes('reorder') || h.includes('rop') || h.includes('point')) colMap['reorder'] = idx;
    });

    if (colMap['kode'] === undefined || colMap['nama'] === undefined) {
      throw new Error('Format salah. Baris pertama wajib berisi judul kolom (header) seperti "Kode Obat" dan "Nama Obat" atau "Nama Oba".');
    }

    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(separator).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cells.length === 0 || !cells[colMap['kode']]) continue;

      const kode_obat = cells[colMap['kode']];
      const nama_obat = cells[colMap['nama']];
      if (!kode_obat || !nama_obat) continue;

      const satuan = colMap['satuan'] !== undefined ? cells[colMap['satuan']] || 'PCS' : 'PCS';
      const kemasan = colMap['kemasan'] !== undefined ? cells[colMap['kemasan']] || 'Box' : 'Box';
      
      let harga_satuan = 0;
      if (colMap['harga'] !== undefined && cells[colMap['harga']]) {
        const cleanStr = cells[colMap['harga']].replace(/[^\d.]/g, '');
        harga_satuan = parseFloat(cleanStr) || 0;
      }

      let lead_time_hari = 2;
      if (colMap['lead'] !== undefined && cells[colMap['lead']]) {
        lead_time_hari = parseInt(cells[colMap['lead']]) || 2;
      }

      let safety_stock = 0;
      if (colMap['safety'] !== undefined && cells[colMap['safety']]) {
        safety_stock = parseInt(cells[colMap['safety']]) || 0;
      }

      let stok_minimum = 0;
      if (colMap['minimum'] !== undefined && cells[colMap['minimum']]) {
        stok_minimum = parseInt(cells[colMap['minimum']]) || 0;
      }

      let reorder_point = 0;
      if (colMap['reorder'] !== undefined && cells[colMap['reorder']]) {
        reorder_point = parseInt(cells[colMap['reorder']]) || 0;
      }

      items.push({
        kode_obat,
        nama_obat,
        golongan: 'Obat Bebas',
        satuan,
        kemasan,
        harga_satuan,
        lead_time_hari,
        safety_stock,
        stok_minimum,
        reorder_point
      });
    }

    return items;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    const nameLower = file.name.toLowerCase();

    if (importTab === 'excel') {
      if (!nameLower.endsWith('.xlsx')) {
        setFeedback({ type: 'error', msg: 'Harap upload file Excel / Spreadsheet dengan format .xlsx sesuai template.' });
        return;
      }

      try {
        setImporting(true);
        setFeedback(null);
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64Str = (reader.result as string).split(',')[1];
          try {
            const res = await api.post('/obat/import', { fileBase64: base64Str });
            setFeedback({ type: 'success', msg: res.data.message || 'Data obat berhasil diimpor.' });
            loadMedicines();
          } catch (err: any) {
            console.error(err);
            setFeedback({ 
              type: 'error', 
              msg: 'Gagal mengimpor excel master obat: ' + (err.response?.data?.message || err.message) 
            });
          } finally {
            setImporting(false);
          }
        };
        
        reader.onerror = () => {
          setImporting(false);
          setFeedback({ type: 'error', msg: 'Gagal membaca file.' });
        };
      } catch (err: any) {
        console.error(err);
        setImporting(false);
        setFeedback({ type: 'error', msg: 'Error: ' + err.message });
      }
    } else {
      // CSV Upload
      if (!nameLower.endsWith('.csv')) {
        setFeedback({ type: 'error', msg: 'Harap upload file CSV dengan format ekstensi .csv.' });
        return;
      }

      try {
        setImporting(true);
        setFeedback(null);
        
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = async () => {
          const csvText = reader.result as string;
          try {
            const items = parseCSVOrTabDelimitedText(csvText);
            if (items.length === 0) {
              setFeedback({ type: 'error', msg: 'File CSV tidak mengandung data obat yang valid atau kosong.' });
              return;
            }
            const res = await api.post('/obat/import-bulk', { items });
            setFeedback({ type: 'success', msg: res.data.message || `${items.length} data obat berhasil diimpor.` });
            loadMedicines();
          } catch (err: any) {
            console.error(err);
            setFeedback({ 
              type: 'error', 
              msg: 'Gagal mengimpor CSV master obat: ' + (err.response?.data?.message || err.message) 
            });
          } finally {
            setImporting(false);
          }
        };
        
        reader.onerror = () => {
          setImporting(false);
          setFeedback({ type: 'error', msg: 'Gagal membaca file.' });
        };
      } catch (err: any) {
        console.error(err);
        setImporting(false);
        setFeedback({ type: 'error', msg: 'Error: ' + err.message });
      }
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) {
      setFeedback({ type: 'error', msg: 'Silakan tempel (paste) data spreadsheet di area teks terlebih dahulu.' });
      return;
    }
    try {
      setImporting(true);
      setFeedback(null);
      const items = parseCSVOrTabDelimitedText(pastedText);
      if (items.length === 0) {
        setFeedback({ type: 'error', msg: 'Tidak ditemukan data obat yang valid pada teks yang Anda tempel.' });
        return;
      }
      const res = await api.post('/obat/import-bulk', { items });
      setFeedback({ type: 'success', msg: res.data.message || 'Sukses mengimpor data obat yang ditempel.' });
      setPastedText('');
      loadMedicines();
    } catch (err: any) {
      console.error(err);
      setFeedback({ 
        type: 'error', 
        msg: 'Gagal mengimpor data tempel: ' + (err.response?.data?.message || err.message) 
      });
    } finally {
      setImporting(false);
    }
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
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Load medicines catalog
  const loadMedicines = async () => {
    await queryClient.invalidateQueries({ queryKey: ['obat-master'] });
  };


  // Filter medicines
  const filteredMedicines = (Array.isArray(medicines) ? medicines : []).filter(med => {
    const matchesGolongan = selectedGolongan === 'Semua' || med.golongan === selectedGolongan;
    return matchesGolongan;
  });

  // Extract distinct drug classes for filters
  const staticGolongan = ['Semua', 'Obat Bebas', 'Obat Bebas Terbatas', 'Obat Keras', 'Psikotropika', 'Narkotika'];
  const dynamicGolongan = Array.from(new Set((Array.isArray(medicines) ? medicines : []).map(m => m.golongan).filter(Boolean)));
  const golonganOptions = Array.from(new Set([...staticGolongan, ...dynamicGolongan]));

  const handleOpenAddForm = () => {
    setEditId(null);
    setKodeObat(`OBT-${Math.floor(1000 + Math.random() * 9000)}`);
    setNamaObat('');
    setGolongan('');
    setSatuan('Tablet');
    setKemasan('DUS / 10 Strips');
    setHargaSatuan('');
    setLeadTime('2');
    setSafetyStock('0');
    setStokMinimum('0');
    setReorderPoint('0');
    setIsActive(1);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleOpenEditForm = (o: ObatMaster) => {
    setEditId(o.id);
    setKodeObat(o.kode_obat);
    setNamaObat(o.nama_obat);
    setGolongan(o.golongan);
    setSatuan(o.satuan);
    setKemasan(o.kemasan);
    setHargaSatuan(String(o.harga_satuan));
    setLeadTime(String(o.lead_time_hari));
    setSafetyStock(String(o.safety_stock || 0));
    setStokMinimum(String(o.stok_minimum || 0));
    setReorderPoint(String(o.reorder_point || 0));
    setIsActive(o.is_active);
    setIsFormOpen(true);
    setFeedback(null);
  };

  const handleSaveObat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaObat || !hargaSatuan) {
      setFeedback({ type: 'error', msg: 'Nama obat dan harga satuan wajib diisi.' });
      return;
    }

    try {
      const dataPayload = {
        kode_obat: kodeObat,
        nama_obat: namaObat,
        golongan: golongan || 'Obat Bebas',
        satuan: satuan || 'Tablet',
        kemasan: kemasan || 'DUS / 10 Strips',
        harga_satuan: Number(hargaSatuan),
        lead_time_hari: Number(leadTime),
        safety_stock: Number(safetyStock || 0),
        stok_minimum: Number(stokMinimum || 0),
        reorder_point: Number(reorderPoint || 0),
        is_active: isActive
      };

      if (editId) {
        await api.put(`/obat/master/${editId}`, dataPayload);
        setFeedback({ type: 'success', msg: `Katalog obat ${namaObat} berhasil diperbarui.` });
      } else {
        await api.post('/obat/master', dataPayload);
        setFeedback({ type: 'success', msg: `Obat baru ${namaObat} berhasil ditambahkan.` });
      }

      setIsFormOpen(false);
      loadMedicines();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal memproses data obat: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleToggleActive = async (o: ObatMaster) => {
    try {
      if (o.is_active === 1) {
        await api.delete(`/obat/master/${o.id}`);
        setFeedback({ type: 'success', msg: `Obat ${o.nama_obat} dinonaktifkan.` });
      } else {
        // Toggle back to active
        await api.put(`/obat/master/${o.id}`, { ...o, is_active: 1 });
        setFeedback({ type: 'success', msg: `Obat ${o.nama_obat} diaktifkan kembali.` });
      }
      loadMedicines();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal mengubah status obat.' });
    }
  };

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
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4"
    >
      {/* Header controls */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-600" />
            <span>Master Data Katalog Obat</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Daftar pengenalan stok, golongan dosis, unit kemasan, dan patokan harga obat di Klinik Puri Medika.
          </p>
        </div>

        {/* Action button */}
        {(user?.role === 'admin' || user?.role === 'farmasi') && (
          <button
            id="add-obat-btn"
            onClick={handleOpenAddForm}
            className="flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer text-xs"
            style={{ minHeight: '38px' }}
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Obat Baru</span>
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            id="obat-feedback-alert" 
            className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-semibold shadow-sm ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
            <span>{feedback.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import module with tabs */}
      {(user?.role === 'admin' || user?.role === 'farmasi') && (
        <motion.div variants={itemVariants} className="bg-white p-5 border border-slate-100/80 shadow-sm rounded-2xl space-y-4">
          <div className="flex border-b border-slate-100 pb-2 space-x-4">
            <button
              id="tab-excel-btn"
              type="button"
              onClick={() => { setImportTab('excel'); setFeedback(null); }}
              className={`pb-2 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer ${
                importTab === 'excel' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              id="tab-csv-btn"
              type="button"
              onClick={() => { setImportTab('csv'); setFeedback(null); }}
              className={`pb-2 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer ${
                importTab === 'csv' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              CSV (.csv)
            </button>
            <button
              id="tab-paste-btn"
              type="button"
              onClick={() => { setImportTab('paste'); setFeedback(null); }}
              className={`pb-2 text-xs font-bold transition-all border-b-2 px-1 cursor-pointer ${
                importTab === 'paste' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Paste Data (Kopi-Tempel)
            </button>
          </div>

          {importTab === 'excel' && (
            <div 
              id="drug-import-dropzone"
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-200 ${
                hoverDrag 
                  ? 'border-teal-500 bg-teal-50/50 text-teal-700' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50 hover:border-slate-200'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-2.5 bg-white rounded-full shadow-xs border border-slate-200 flex items-center justify-center">
                  <RefreshCw className={`h-5 w-5 text-teal-600 ${importing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs">Import Data Master Obat (.xlsx)</span>
                  <p className="text-[10px] text-slate-505 mt-1 max-w-lg mx-auto leading-relaxed">
                    Silakan drop file Excel (.xlsx) atau klik tombol di bawah. Kolom yang diimpor: 
                    <span className="text-teal-600 font-mono font-medium"> Kode Obat | Nama Obat | Satuan | Kemasan | Harga Satuan | Safety Stock | Lead Time | Stok Minimum | Reorder Point</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await api.get('/obat/template-excel', { responseType: 'blob' });
                        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = 'template_master_obat.xlsx';
                        link.click();
                      } catch (err) {
                        Swal.fire({
                          title: 'Unduh Gagal',
                          text: 'Gagal mengunduh template Excel. Silakan coba lagi.',
                          icon: 'error',
                          confirmButtonColor: '#0d9488'
                        });
                        console.error('Failed to download template excel', err);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 font-bold bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 cursor-pointer transition-all"
                  >
                    📥 Unduh/Download Template Excel (.xlsx)
                  </button>

                  <label className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer text-[10px] min-h-[32px] hover:shadow-md">
                    <span>{importing ? 'Mengimpor Data...' : 'Pilih File Excel (.xlsx)'}</span>
                    <input 
                      id="excel-file-uploader"
                      type="file" 
                      accept=".xlsx" 
                      className="hidden" 
                      disabled={importing}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {importTab === 'csv' && (
            <div 
              id="drug-import-csv-dropzone"
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all duration-200 ${
                hoverDrag 
                  ? 'border-teal-500 bg-teal-50/50 text-teal-700' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100/50 hover:border-slate-200'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-2.5 bg-white rounded-full shadow-xs border border-slate-200 flex items-center justify-center">
                  <RefreshCw className={`h-5 w-5 text-teal-650 ${importing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs">Import Data Master Obat (.csv)</span>
                  <p className="text-[10px] text-slate-505 mt-1 max-w-lg mx-auto leading-relaxed">
                    Silakan drop file CSV (.csv) atau klik tombol di bawah. Kolom yang diimpor: 
                    <span className="text-teal-600 font-mono font-medium"> Kode Obat | Nama Obat | Satuan | Harga Satuan | Safety Stock</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await api.get('/obat/template-csv', { responseType: 'blob' });
                        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = 'template_master_obat.csv';
                        link.click();
                      } catch (err) {
                        Swal.fire({
                          title: 'Unduh Gagal',
                          text: 'Gagal mengunduh template CSV. Silakan coba lagi.',
                          icon: 'error',
                          confirmButtonColor: '#0d9488'
                        });
                        console.error('Failed to download template csv', err);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-teal-700 hover:text-teal-900 font-bold bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 cursor-pointer transition-all"
                  >
                    📥 Unduh/Download Template CSV (.csv)
                  </button>

                  <label className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer text-[10px] min-h-[32px] hover:shadow-md">
                    <span>{importing ? 'Mengimpor Data...' : 'Pilih File CSV (.csv)'}</span>
                    <input 
                      id="csv-file-uploader"
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      disabled={importing}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {importTab === 'paste' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tempel Data Excel / Spreadsheet</label>
                <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                  Buka file excel Anda, salin baris data (termasuk baris paling atas untuk nama kolom/header), lalu tempelkan (Ctrl+V) langsung ke kotak di bawah ini. Kolom wajib: <span className="font-semibold text-teal-600">Kode Obat</span> dan <span className="font-semibold text-teal-600">Nama Obat</span>.
                </p>
                <textarea
                  id="paste-textarea"
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Contoh format:&#10;Kode Obat&#9;Nama Obat&#9;Satuan&#9;Harga Satuan&#9;Safety Stock&#10;OBT-001&#9;Paracetamol&#9;Tablet&#9;250&#9;100&#10;OBT-002&#9;Amoxicillin&#9;Kaplet&#9;600&#9;200"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono text-slate-800 focus:ring-1 focus:ring-teal-500/20 focus:border-teal-300 focus:outline-none placeholder-slate-400"
                />
              </div>
              <button
                id="btn-import-paste-data"
                type="button"
                disabled={importing}
                onClick={handlePasteSubmit}
                className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow-xs transition-colors text-xs cursor-pointer disabled:opacity-50 min-h-[36px]"
              >
                {importing ? 'Mengimpor Data...' : 'Import Data Tempel'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Dynamic Input/Edit Block Form Drawer style */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 text-xs"
          >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-xs font-extrabold text-teal-450">
              {editId ? `Ubah Data Obat: ${kodeObat}` : 'Tambah Katalog Obat Baru'}
            </h2>
            <button 
              id="close-obat-form-btn"
              onClick={() => setIsFormOpen(false)} 
              className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveObat} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="kode" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kode Obat</label>
              <input
                id="kode"
                type="text"
                required
                value={kodeObat}
                onChange={(e) => setKodeObat(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-teal-500/35"
              />
            </div>

            <div>
              <label htmlFor="nama" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nama Obat</label>
              <input
                id="nama"
                type="text"
                required
                placeholder="ex: Paracetamol"
                value={namaObat}
                onChange={(e) => setNamaObat(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-teal-500/35"
              />
            </div>

            <div>
              <label htmlFor="satuan" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Satuan</label>
              <input
                id="satuan"
                type="text"
                placeholder="ex: Tablet, Kapsul, Botol, Pcs"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-teal-500/35"
              />
            </div>

            <div>
              <label htmlFor="harga" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Harga Satuan (Rp)</label>
              <div className="relative mt-1 rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-xs font-mono">Rp</span>
                </div>
                <input
                  id="harga"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={hargaSatuan}
                  onChange={(e) => setHargaSatuan(e.target.value)}
                  className="pl-9 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-teal-500/35 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="safetystock" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Safety Stock (Unit)</label>
              <input
                id="safetystock"
                type="number"
                min="0"
                required
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-teal-500/35 font-mono"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Diaktifkan</label>
              <select
                id="status"
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-teal-500/35 cursor-pointer"
                style={{ minHeight: '38px' }}
              >
                <option value={1}>Aktif (Bisa Diorder)</option>
                <option value={0}>Tidak Aktif / Tangguhkan</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                id="cancel-obat-btn"
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer text-xs font-bold"
                style={{ minHeight: '36px' }}
              >
                Batalkan
              </button>
              <button
                id="submit-obat-btn"
                type="submit"
                className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer text-xs"
                style={{ minHeight: '36px' }}
              >
                <Save className="h-4 w-4" />
                <span>Simpan Katalog</span>
              </button>
            </div>
          </form>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Searching & Filter tool rails */}
      <motion.div variants={itemVariants} className="bg-white p-3.5 border border-slate-100/80 shadow-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative rounded-xl shadow-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            id="search-obat"
            type="text"
            placeholder="Cari berdasarkan nama/kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 block w-full px-3 py-2 bg-slate-50 border border-slate-200/70 rounded-2xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-300 text-xs font-medium animate-none placeholder-slate-400"
            style={{ minHeight: '38px' }}
          />
        </div>
      </motion.div>

      {/* Catalog lists table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100/70 text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Kode Obat</th>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Obat</th>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Satuan</th>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Harga Satuan</th>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Safety Stock</th>
                <th scope="col" className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                {(user?.role === 'admin' || user?.role === 'farmasi') && (
                  <th scope="col" className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 text-slate-700 text-xs font-semibold">
              <AnimatePresence mode="popLayout">
              {loading ? (
                <motion.tr 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    <RefreshCw className="h-5 w-5 text-teal-600 animate-spin mx-auto mb-2" />
                    <span>Sinkronisasi katalog...</span>
                  </td>
                </motion.tr>
              ) : filteredMedicines.length === 0 ? (
                <motion.tr 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Tidak ditemukan obat yang cocok dengan kriteria filter.
                  </td>
                </motion.tr>
              ) : (
                filteredMedicines.map((m) => (
                  <motion.tr 
                    key={m.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/60 font-bold">
                        {m.kode_obat}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-slate-900 text-xs">{m.nama_obat}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-600">
                      {m.satuan}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                      Rp {Number(m.harga_satuan).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600">
                      {m.safety_stock ?? 0} Unit
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.is_active === 1 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.is_active === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span>{m.is_active === 1 ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </td>
                    {(user?.role === 'admin' || user?.role === 'farmasi') && (
                      <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`edit-obat-${m.id}`}
                            onClick={() => handleOpenEditForm(m)}
                            className="p-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-teal-600 font-bold text-xs flex items-center space-x-1"
                            title="Edit obat"
                            style={{ minHeight: '28px' }}
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            id={`toggle-active-obat-${m.id}`}
                            onClick={() => handleToggleActive(m)}
                            className={`p-1 px-2 rounded-lg text-xs font-bold flex items-center space-x-1 border ${
                              m.is_active === 1 
                                ? 'border-rose-150 text-rose-600 hover:bg-rose-50' 
                                : 'border-emerald-150 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={m.is_active === 1 ? 'Tangguhkan obat' : 'Aktifkan obat'}
                            style={{ minHeight: '28px' }}
                          >
                            <Ban className="h-3 w-3" />
                            <span>{m.is_active === 1 ? 'Tangguhkan' : 'Aktifkan'}</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Beautiful Pagination Footer */}
        <div className="bg-slate-50/30 px-4 py-3.5 border-t border-slate-100/70 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Sebelumnya</span>
          </button>
          
          <span className="text-xs font-bold text-slate-500">
            Halaman {currentPage} dari {pagination.totalPages} (Total {pagination.total} obat)
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
            disabled={currentPage === pagination.totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
