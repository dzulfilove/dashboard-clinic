import { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  UserPlus, 
  Check, 
  AlertCircle,
  RefreshCw,
  Users2
} from 'lucide-react';
import api from '../../services/api';

interface Pasien {
  no_rm: string;
  nama: string;
}

export default function MasterPasien() {
  const [data, setData] = useState<Pasien[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pasien | null>(null);
  const [formData, setFormData] = useState({
    no_rm: '',
    nama: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPasiens = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pasien');
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Gagal mengambil data pasien.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasiens();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ no_rm: '', nama: '' });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Pasien) => {
    setEditingItem(item);
    setFormData({ no_rm: item.no_rm, nama: item.nama });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (no_rm: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus pasien dengan No. RM: ${no_rm}?`)) return;
    try {
      await api.delete(`/pasien/${no_rm}`);
      setFeedback({ type: 'success', message: 'Pasien berhasil dikosongkan dari riwayat.' });
      fetchPasiens();
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Batas otorisasi: Hanya Administrator yang berhak menghapus master data pasien.' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.no_rm.trim() || !formData.nama.trim()) {
      setFeedback({ type: 'error', message: 'No. RM dan Nama Pasien wajib diisi.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      if (editingItem) {
        // Edit Mode
        await api.put(`/pasien/${editingItem.no_rm}`, { nama: formData.nama });
        setFeedback({ type: 'success', message: 'Informasi pasien berhasil diperbarui.' });
      } else {
        // Add Mode
        await api.post('/pasien', formData);
        setFeedback({ type: 'success', message: 'Pasien baru berhasil didaftarkan.' });
      }
      setIsModalOpen(false);
      fetchPasiens();
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Gagal menyimpan: Pastikan No Rekam Medis (RM) unik dan akun Anda memiliki peran perawat/admin.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = data.filter(p => 
    p.nama.toLowerCase().includes(search.toLowerCase()) || 
    p.no_rm.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="h-6 w-6 text-teal-600" />
            <span>Master Data Pasien</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Riwayat pendaftaran Rekam Medis (no_rm) pasien Klinik Puri Medika.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-pasien"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-extrabold text-sm rounded-xl shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Daftarkan Pasien Baru</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
        {/* Controls header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="search-pasien"
              placeholder="Cari No. RM atau nama pasien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl font-medium transition"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono sm:text-right">
            Menampilkan {filteredData.length} dari {data.length} pasien
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
            <span className="font-semibold text-sm">Mengambil data pasien...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-500" />
            <p className="font-extrabold text-sm text-slate-600">Tidak ada pasien ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan rekam medis pencarian Anda atau daftarkan baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="py-3.5 px-5 text-xxs font-extrabold text-slate-500 tracking-wider uppercase">Nomor Rekam Medis (RM)</th>
                  <th className="py-3.5 px-5 text-xxs font-extrabold text-slate-500 tracking-wider uppercase">Nama Lengkap Pasien</th>
                  <th className="py-3.5 px-5 text-xxs font-extrabold text-slate-500 tracking-wider uppercase text-right">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((p) => (
                  <tr key={p.no_rm} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-5 text-xs font-black text-slate-900 font-mono">
                      {p.no_rm}
                    </td>
                    <td className="py-3 px-5 text-sm font-extrabold text-slate-800">
                      {p.nama}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          id={`edit-pasien-${p.no_rm}`}
                          title="Ubah Profil Pasien"
                          className="p-1 px-2.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-slate-450 transition text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Ubah</span>
                        </button>
                        <button
                          onClick={() => handleDelete(p.no_rm)}
                          id={`delete-pasien-${p.no_rm}`}
                          title="Hapus Safely"
                          className="p-1 px-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-450 transition text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-150 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingItem ? 'Perbarui Profil Pasien Ny / Tuan' : 'Pendaftaran Nomor Rekam Medis'}
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
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">No. Rekam Medis (No RM)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingItem}
                  placeholder="Contoh: 001234"
                  value={formData.no_rm}
                  onChange={(e) => setFormData(prev => ({ ...prev, no_rm: e.target.value }))}
                  className="w-full text-sm font-semibold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl p-2.5 transition bg-white disabled:bg-slate-50 disabled:text-slate-450"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Nama Lengkap Pasien</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Della Trisyanasari, Ny"
                  value={formData.nama}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  className="w-full text-sm font-semibold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl p-2.5 transition"
                />
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
                  <span>{editingItem ? 'Simpan Pembaruan' : 'Daftarkan Pasien'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
