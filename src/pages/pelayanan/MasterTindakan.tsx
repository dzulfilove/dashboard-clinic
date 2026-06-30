import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Swal from 'sweetalert2';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Activity, 
  Check, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';

interface Tindakan {
  id: number;
  nama_tindakan: string;
  jenis: 'RALAN' | 'RANAP';
}

export default function MasterTindakan() {
  const [data, setData] = useState<Tindakan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tindakan | null>(null);
  const [formData, setFormData] = useState({
    nama_tindakan: '',
    jenis: 'RALAN' as 'RALAN' | 'RANAP'
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master-tindakan');
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Gagal mengambil data tindakan.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ nama_tindakan: '', jenis: 'RALAN' });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Tindakan) => {
    setEditingItem(item);
    setFormData({ nama_tindakan: item.nama_tindakan, jenis: item.jenis });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'Hapus Tindakan?',
      text: 'Apakah Anda yakin ingin menghapus tindakan ini? Hal ini tidak dapat dibatalkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/master-tindakan/${id}`);
          setFeedback({ type: 'success', message: 'Tindakan berhasil dihapus.' });
          fetchData();
        } catch (err: any) {
          setFeedback({ 
            type: 'error', 
            message: err.response?.data?.message || 'Batas otorisasi: Hanya Administrator yang berhak menghapus master data.' 
          });
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_tindakan.trim()) {
      setFeedback({ type: 'error', message: 'Nama tindakan tidak boleh kosong.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingItem) {
        // Edit Mode
        await api.put(`/master-tindakan/${editingItem.id}`, formData);
        setFeedback({ type: 'success', message: 'Tindakan berhasil diperbarui.' });
      } else {
        // Add Mode
        await api.post('/master-tindakan', formData);
        setFeedback({ type: 'success', message: 'Tindakan baru berhasil didaftarkan.' });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Otorisasi gagal: Pastikan akun Anda memiliki peran Administrator.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter(t => 
    (t.nama_tindakan || '').toLowerCase().includes(search.toLowerCase()) || 
    (t.jenis || '').toLowerCase().includes(search.toLowerCase())
  );

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
            <Activity className="h-5 w-5 text-teal-600" />
            <span>Master Data Tindakan Klinik</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Kelola katalog tindakan/pelayanan medis rawat jalan (RALAN) dan rawat inap (RANAP) Klinik Puri Medika.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-tindakan"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-medium text-xs rounded-lg shadow-sm"
        >
          <Plus className="h-3 w-3" />
          <span>Tambah</span>
        </button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'height, opacity' }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
            }`}
          >
            {feedback.type === 'success' ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
        style={{ willChange: 'transform, opacity' }}
        className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden"
      >
        {/* Controls header */}
        <div className="p-4 sm:p-5 border-b border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="search-tindakan"
              placeholder="Cari nama atau jenis pelayanan (contoh: USG, Ralan)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl font-medium transition"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono sm:text-right">
            Menampilkan {filteredData.length} dari {data.length} tindakan
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
            <span className="font-semibold text-sm">Mengambil katalog tindakan...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-500" />
            <p className="font-extrabold text-sm text-slate-600">Tidak ada tindakan ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda atau tambahkan master baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/70">
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">ID Kode</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Nama Layanan Tindakan Medis</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Klasifikasi Jenis</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider text-right">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                {filteredData.map((t, i) => (
                  <motion.tr 
                    key={t.id} 
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="py-3 px-5 text-xs text-slate-600 font-mono">
                      #{String(t.id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {t.nama_tindakan}
                    </td>
                    <td className="py-3 px-5">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-normal tracking-wide rounded-full ${
                        t.jenis === 'RALAN' 
                          ? 'bg-teal-50 text-teal-700 border border-teal-150' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                      }`}>
                        {t.jenis === 'RALAN' ? 'Rawat Jalan' : 'Rawat Inap'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          id={`edit-tindakan-${t.id}`}
                          title="Perbarui Metadata"
                          className="p-1 px-2.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Ubah</span>
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          id={`delete-tindakan-${t.id}`}
                          title="Hapus Permanen"
                          className="p-1 px-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Action modal dialog */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100/70 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'Perbarui Layanan Tindakan' : 'Daftarkan Tindakan Layanan Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Nama Tindakan Medis</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KONSULTASI + USG 4D"
                  value={formData.nama_tindakan}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_tindakan: e.target.value }))}
                  className="w-full text-sm font-medium border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Klasifikasi Jenis</label>
                <select
                  value={formData.jenis}
                  onChange={(e) => setFormData(prev => ({ ...prev, jenis: e.target.value as 'RALAN' | 'RANAP' }))}
                  className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                >
                  <option value="RALAN">Rawat Jalan (RALAN)</option>
                  <option value="RANAP">Rawat Inap (RANAP)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-700 active:scale-97 disabled:opacity-50 rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingItem ? 'Simpan Pembaruan' : 'Simpan Tindakan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
