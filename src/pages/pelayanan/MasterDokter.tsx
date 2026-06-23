import { useEffect, useState, useRef } from 'react';
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
  Stethoscope,
  FileUp,
  Download
} from 'lucide-react';
import api from '../../services/api';
import Papa from 'papaparse';

interface Dokter {
  id: number;
  nama_dokter: string;
  status: 'aktif' | 'non-aktif';
}

export default function MasterDokter() {
  const [data, setData] = useState<Dokter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Dokter | null>(null);
  const [formData, setFormData] = useState({
    nama_dokter: '',
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
    setFormData({ nama_dokter: '', status: 'aktif' });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Dokter) => {
    setEditingItem(item);
    setFormData({ 
      nama_dokter: item.nama_dokter, 
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
      setIsModalOpen(false);
      fetchDokters();
    } catch (err: any) {
      setFeedback({ 
        type: 'error', 
        message: err.response?.data?.message || 'Gagal menyimpan data dokter. Periksa hak akses Anda.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const doctors = results.data.map((row: any) => ({
            nama_dokter: row.nama_dokter || row.nama || row.Nama,
            status: (row.status || row.Status || 'aktif').toLowerCase() === 'aktif' ? 'aktif' : 'non-aktif'
          })).filter(d => d.nama_dokter);

          if (doctors.length === 0) {
            setFeedback({ type: 'error', message: 'Tidak ada data dokter valid ditemukan di CSV.' });
            setLoading(false);
            return;
          }

          await api.post('/dokter/bulk', { doctors });
          setFeedback({ type: 'success', message: `${doctors.length} dokter berhasil diimpor.` });
          fetchDokters();
        } catch (err) {
          console.error(err);
          setFeedback({ type: 'error', message: 'Gagal mengimpor data CSV.' });
          setLoading(false);
        }
      },
      error: (err) => {
        console.error(err);
        setFeedback({ type: 'error', message: 'Kesalahan saat membaca file CSV.' });
        setLoading(false);
      }
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = "nama_dokter,status\ndr. Example Name,aktif\ndr. Another Name,non-aktif";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_dokter.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = data.filter(item => 
    (item.nama_dokter || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-teal-600" />
            <span>Master Data Dokter</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Daftar tenaga medis dan DPJP unit pelayanan Klinik Puri Medika.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition shadow-sm"
          >
            <Download className="h-3 w-3" />
            <span>Template</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-lg transition shadow-sm"
          >
            <FileUp className="h-3 w-3" />
            <span>Import CSV</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportCSV} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-medium text-xs rounded-lg shadow-sm"
          >
            <Plus className="h-3 w-3" />
            <span>Tambah Dokter</span>
          </button>
        </div>
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
              placeholder="Cari nama dokter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl font-medium transition"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono sm:text-right">
            Total {filteredData.length} dokter
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
            <span className="font-semibold text-sm">Update data...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40 text-slate-500" />
            <p className="font-extrabold text-sm text-slate-600">Tidak ada dokter ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Nama Dokter</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Status</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-5 text-xs text-slate-800 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                          <User size={14} />
                        </div>
                        {item.nama_dokter}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        item.status === 'aktif' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1 px-2.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Ubah</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 px-2.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
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
                {editingItem ? 'Perbarui Data Dokter' : 'Registrasi Dokter Baru'}
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
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Nama Lengkap Dokter</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: dr. Budi Santoso"
                  value={formData.nama_dokter}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_dokter: e.target.value }))}
                  className="w-full text-sm font-semibold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl p-2.5 transition bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Status Keaktifan</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'aktif' | 'non-aktif' }))}
                  className="w-full text-sm font-semibold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl p-2.5 transition bg-white"
                >
                  <option value="aktif">AKTIF</option>
                  <option value="non-aktif">NON-AKTIF</option>
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
                  <span>{editingItem ? 'Simpan Perubahan' : 'Simpan Dokter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
