import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api.js';
import { Plus, Trash2, Edit2, X, Check, Search, ChevronLeft, ChevronRight, Database, CheckCircle, Info, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface ICD10 {
  id: number;
  kode_icd: string;
  deskripsi: string;
}

export default function MasterICD10() {
  const [data, setData] = useState<ICD10[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ICD10 | null>(null);
  const [formData, setFormData] = useState({ kode_icd: '', deskripsi: '' });
  
  // Search and Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dbStatus, setDbStatus] = useState<{ isVirtual: boolean; status: string } | null>(null);
  const itemsPerPage = 50;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pelayanan/icd10', {
        params: {
          q: searchQuery,
          page: currentPage,
          limit: itemsPerPage
        }
      });
      setData(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalItems(res.data?.pagination?.total || 0);
      
      const statusRes = await api.get('/db/status');
      setDbStatus(statusRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/pelayanan/icd10/${editingItem.id}`, formData);
      } else {
        await api.post('/pelayanan/icd10', formData);
      }
      setIsModalOpen(false);
      setFormData({ kode_icd: '', deskripsi: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Pagination index calculation
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data;

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: Math.min(i * 0.02, 0.15), duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
    })
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            <span>Master Data ICD-10 Diagnosis</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Gunakan katalog rujukan kodifikasi klinis WHO ICD-10 untuk diagnosa pelayanan rawat jalan dan rekam medis.
          </p>
        </div>
        
        <button 
          onClick={() => { setEditingItem(null); setFormData({ kode_icd: '', deskripsi: '' }); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-medium text-xs rounded-lg shadow-sm cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Tambah ICD-10
        </button>
      </div>



      {/* Search Input Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
        style={{ willChange: 'transform, opacity' }}
        className="bg-white p-4 border border-slate-100 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode ICD-10 atau nama penyakit/deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-hidden"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Menampilkan {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} dari {totalItems} hasil pencarian
        </div>
      </motion.div>

      {/* Main Table view */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.10 }}
        style={{ willChange: 'transform, opacity' }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden"
      >
        <table className="w-full">
          <thead className="bg-slate-50/50 border-b border-slate-100/70 text-xs text-slate-500 uppercase font-black tracking-wider">
            <tr>
              <th className="p-4 text-left w-1/4">Kode ICD-10</th>
              <th className="p-4 text-left">Nama Diagnosa / Deskripsi</th>
              <th className="p-4 text-right w-[100px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={3} className="p-12 text-center text-sm text-slate-400 font-medium">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-teal-600 mb-2"></div>
                  <p>Memuat data katalog diagnosis klinis...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-12 text-center text-sm text-slate-400 font-medium">
                  <span className="text-lg">🔍</span>
                  <p className="mt-2">Tidak ada data ICD-10 yang cocok dengan pencarian Anda.</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, i) => (
                <motion.tr 
                  key={item.id} 
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="p-4 text-sm font-semibold font-mono text-teal-700">{item.kode_icd}</td>
                  <td className="p-4 text-sm font-medium">{item.deskripsi}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setEditingItem(item); setFormData({ kode_icd: item.kode_icd, deskripsi: item.deskripsi }); setIsModalOpen(true); }} 
                      className="p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                      title="Ubah diagnosa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

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
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Edit/Create Popup Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl border border-slate-100">
            <h3 className="font-bold text-lg mb-1 text-slate-850">{editingItem ? 'Edit ICD-10' : 'Tambah ICD-10'}</h3>
            <p className="text-slate-500 text-[10px] font-medium mb-5 uppercase tracking-wider">Diagnosis WHO untuk standarisasi rekam medis.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Kode ICD-10</label>
                <input 
                  type="text" 
                  placeholder="Contoh: A09 atau J00" 
                  value={formData.kode_icd} 
                  onChange={e => setFormData({...formData, kode_icd: e.target.value.toUpperCase()})} 
                  className="w-full p-2.5 border border-slate-100 rounded-xl text-sm focus:ring-4 focus:ring-teal-500/5 focus:border-teal-300 outline-none font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-1">Nama Penyakit / Deskripsi</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Gastrointestinal Acute" 
                  value={formData.deskripsi} 
                  onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
                  className="w-full p-2.5 border border-slate-100 rounded-xl text-sm focus:ring-4 focus:ring-teal-500/5 focus:border-teal-300 outline-none font-medium" 
                  required 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100/70">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-slate-50 rounded-xl text-sm text-slate-500 font-bold">Batal</button>
              <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors shadow-xs">Simpan</button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}

