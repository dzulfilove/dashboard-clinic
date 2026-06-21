import { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  User, 
  Check, 
  AlertCircle,
  RefreshCw,
  Stethoscope
} from 'lucide-react';
import api from '../../services/api';
import { motion } from 'motion/react';

interface Dokter {
  id: number;
  nama_dokter: string;
  spesialisasi: string;
  no_sip: string;
  status: 'aktif' | 'non-aktif';
}

export default function MasterDokter() {
  const [data, setData] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Dokter | null>(null);
  const [formData, setFormData] = useState({
    nama_dokter: '',
    spesialisasi: '',
    no_sip: '',
    status: 'aktif' as 'aktif' | 'non-aktif'
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDokters = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dokter');
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Gagal mengambil data dokter.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDokters();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ nama_dokter: '', spesialisasi: '', no_sip: '', status: 'aktif' });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Dokter) => {
    setEditingItem(item);
    setFormData({ 
      nama_dokter: item.nama_dokter, 
      spesialisasi: item.spesialisasi || '', 
      no_sip: item.no_sip || '', 
      status: item.status 
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data dokter ini?')) return;
    try {
      await api.delete(`/dokter/${id}`);
      setFeedback({ type: 'success', message: 'Data dokter berhasil dihapus.' });
      fetchDokters();
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Batas otorisasi: Hanya Administrator yang berhak menghapus master data.' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_dokter.trim()) {
      setFeedback({ type: 'error', message: 'Nama dokter tidak boleh kosong.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingItem) {
        await api.put(`/dokter/${editingItem.id}`, formData);
        setFeedback({ type: 'success', message: 'Data dokter berhasil diperbarui.' });
      } else {
        await api.post('/dokter', formData);
        setFeedback({ type: 'success', message: 'Dokter baru berhasil didaftarkan.' });
      }
      setTimeout(() => {
        setIsModalOpen(false);
        fetchDokters();
      }, 1000);
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Gagal menyimpan data dokter. Periksa hak akses Anda.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter(item => 
    item.nama_dokter.toLowerCase().includes(search.toLowerCase()) ||
    (item.spesialisasi && item.spesialisasi.toLowerCase().includes(search.toLowerCase())) ||
    (item.no_sip && item.no_sip.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
      {/* Header section with minimal branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-1 bg-teal-600 rounded-full"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700/60">Sistem Informasi Rumah Sakit</span>
          </div>
          <h1 className="text-3xl font-black text-slate-850 tracking-tight flex items-center gap-3">
            Master <span className="text-teal-600 italic">Dokter</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Kelola data tenaga medis dan DPJP unit pelayanan</p>
        </div>
        
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-teal-600/20 active:scale-95 self-start"
        >
          <Plus size={18} />
          Tambah Dokter Baru
        </button>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-3 p-4 rounded-2xl ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}
        >
          {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold tracking-tight">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100 italic text-xs">Tutup</button>
        </motion.div>
      )}

      {/* Main Table Content */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative group w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cari dokter, spesialisasi, atau SIP..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-600/10 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
          
          <button 
            onClick={fetchDokters}
            className="flex items-center gap-2 text-slate-500 hover:text-teal-600 p-2 transition-colors rounded-xl hover:bg-slate-50"
            title="Muat ulang data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Infografis Dokter</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <RefreshCw className="animate-spin text-teal-600 mb-2" size={32} />
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sinkronisasi Database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30 grayscale">
                       <User size={48} className="text-slate-300" />
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Data Dokter Tidak Ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                          <Stethoscope size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-850 tracking-tight">{item.nama_dokter}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] items-center flex gap-1 font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {item.spesialisasi || 'Umum'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium italic">
                              SIP: {item.no_sip || '-'}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              item.status === 'aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                          title="Ubah Data"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                          title="Hapus Data"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-teal-600 text-white">
              <div>
                <h3 className="text-xl font-black italic tracking-tight">
                  {editingItem ? 'Perbarui Data Dokter' : 'Registrasi Dokter Baru'}
                </h3>
                <p className="text-teal-100 text-xs mt-1 font-medium italic opacity-80 leading-relaxed">
                  Lengkapi berkas identitas medis tenaga kesehatan
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-2xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nama Lengkap Dokter <span className="text-rose-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={formData.nama_dokter}
                    onChange={(e) => setFormData({...formData, nama_dokter: e.target.value})}
                    placeholder="Contoh: dr. Budi Santoso, Sp.PD"
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-600/10 font-bold tracking-tight"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Spesialisasi</label>
                  <input 
                    type="text" 
                    value={formData.spesialisasi}
                    onChange={(e) => setFormData({...formData, spesialisasi: e.target.value})}
                    placeholder="Contoh: Spesialis Penyakit Dalam"
                    className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-600/10 font-bold tracking-tight"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nomor SIP</label>
                    <input 
                      type="text" 
                      value={formData.no_sip}
                      onChange={(e) => setFormData({...formData, no_sip: e.target.value})}
                      placeholder="No. Surat Izin Praktik"
                      className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-600/10 font-bold tracking-tight"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Status Keaktifan</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as 'aktif' | 'non-aktif'})}
                      className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-teal-600/10 font-bold tracking-tight appearance-none"
                    >
                      <option value="aktif">AKTIF</option>
                      <option value="non-aktif">NON-AKTIF</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : (
                    <>
                      <Check size={20} />
                      {editingItem ? 'SIMPAN PERUBAHAN DATA' : 'DAFTARKAN DOKTER SEKARANG'}
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
