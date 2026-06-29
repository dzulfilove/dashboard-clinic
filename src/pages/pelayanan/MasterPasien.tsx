import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
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
  Users2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Pasien } from '../../types';

export default function MasterPasien() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
  const [selectedPasien, setSelectedPasien] = useState<Pasien | null>(null);
  const [editingItem, setEditingItem] = useState<Pasien | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [data, setData] = useState<Pasien[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  const [kotaList, setKotaList] = useState<any[]>([]);
  const [kecamatanList, setKecamatanList] = useState<any[]>([]);
  const [kelurahanList, setKelurahanList] = useState<any[]>([]);

  const fetchVisitsForPatient = async (no_rm: string) => {
    try {
      const res = await api.get('/pelayanan/rawat-jalan');
      setVisits(res.data.filter((v: any) => v.no_rm === no_rm));
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetailModal = (item: Pasien) => {
    setSelectedPasien(item);
    fetchVisitsForPatient(item.no_rm);
    setIsDetailModalOpen(true);
  };

  const handleOpenVisitDetail = (visit: any) => {
    setSelectedVisit(visit);
    setIsVisitDetailModalOpen(true);
  };

  const [formData, setFormData] = useState({
    no_rm: '',
    nama: '',
    tanggal_lahir: '',
    alamat: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    kelurahan_id: 0,
    kecamatan_id: 0,
    kota_id: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchPasiens = async () => {
    try {
      setLoading(true);
      const res = await api.get('/pasien', {
        params: {
          q: search,
          page: currentPage,
          limit: itemsPerPage
        }
      });
      setData(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotalItems(res.data?.pagination?.total || 0);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: 'Gagal mengambil data pasien.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWilayah = async () => {
    try {
      const [kR, kecR, kelR] = await Promise.all([
        api.get('/wilayah/kota'),
        api.get('/wilayah/kecamatan'),
        api.get('/wilayah/kelurahan')
      ]);
      setKotaList(kR.data);
      setKecamatanList(kecR.data);
      setKelurahanList(kelR.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPasiens();
  }, [currentPage, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    fetchWilayah();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ 
      no_rm: '', 
      nama: '', 
      tanggal_lahir: '', 
      alamat: '', 
      jenis_kelamin: 'L', 
      kelurahan_id: 0, 
      kecamatan_id: 0, 
      kota_id: 0 
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Pasien) => {
    setEditingItem(item);
    setFormData({
      no_rm: item.no_rm,
      nama: item.nama,
      tanggal_lahir: item.tanggal_lahir || '',
      alamat: item.alamat || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      kelurahan_id: item.kelurahan_id || 0,
      kecamatan_id: item.kecamatan_id || 0,
      kota_id: item.kota_id || 0,
    });
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (no_rm: string) => {
    Swal.fire({
      title: 'Hapus Pasien?',
      text: `Apakah Anda yakin ingin menghapus pasien dengan No. RM: ${no_rm}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
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
      }
    });
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
        await api.put(`/pasien/${editingItem.no_rm}`, formData);
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

  const filteredData = data;

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' }
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
            <Users2 className="h-5 w-5 text-teal-600" />
            <span>Master Data Pasien</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Riwayat pendaftaran Rekam Medis (no_rm) pasien Klinik Puri Medika.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="btn-add-pasien"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-98 transition text-white font-medium text-xs rounded-lg shadow-sm"
        >
          <UserPlus className="h-3 w-3" />
          <span>Daftarkan Pasien Baru</span>
        </button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
        className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden"
      >
        {/* Controls header */}
        <div className="p-4 sm:p-5 border-b border-slate-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              id="search-pasien"
              placeholder="Cari No. RM atau nama pasien..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl font-medium transition"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono sm:text-right">
            Menampilkan {filteredData.length} dari {totalItems} pasien
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
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/70">
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Nomor Rekam Medis (RM)</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Nama Lengkap Pasien</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Tanggal Lahir</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Alamat</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Kelurahan</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Kecamatan</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider">Kota</th>
                  <th className="py-3.5 px-5 text-xs font-semibold text-slate-500 tracking-wider text-right">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                {filteredData.map((p, i) => (
                  <motion.tr 
                    key={p.no_rm} 
                    custom={i}
                    initial="hidden"
                    animate="visible"
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="hover:bg-slate-50/50 transition"
                  >
                    <td className="py-3 px-5 text-xs text-slate-800 font-mono">
                      {p.no_rm}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.nama}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.tanggal_lahir}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.alamat}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.kelurahan?.nama}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.kecamatan?.nama}
                    </td>
                    <td className="py-3 px-5 text-xs text-slate-800">
                      {p.kota?.nama}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(p)}
                          title="Lihat Detail Pasien"
                          className="p-1 px-2.5 hover:bg-teal-50 hover:text-teal-700 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          id={`edit-pasien-${p.no_rm}`}
                          title="Ubah Profil Pasien"
                          className="p-1 px-2.5 hover:bg-slate-100 hover:text-slate-800 rounded-lg text-slate-500 transition text-xs font-normal inline-flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Ubah</span>
                        </button>
                        <button
                          onClick={() => handleDelete(p.no_rm)}
                          id={`delete-pasien-${p.no_rm}`}
                          title="Hapus Safely"
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
        </>
      )}
      </motion.div>

      {/* Detail modal dialog */}
      <AnimatePresence>
      {isDetailModalOpen && selectedPasien && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                Detail Pasien: {selectedPasien.nama}
              </h3>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">No Rekam Medis</p>
                  <p className="font-mono font-semibold text-slate-800">{selectedPasien.no_rm}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Nama Pasien</p>
                  <p className="font-semibold text-slate-800">{selectedPasien.nama}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3">Riwayat Kunjungan</h4>
                {visits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Belum ada riwayat kunjungan.</p>
                ) : (
                  <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Tanggal</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">No Reg</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visits.map((v: any) => (
                          <tr key={v.id} onClick={() => handleOpenVisitDetail(v)} className="hover:bg-slate-50 cursor-pointer">
                            <td className="px-3 py-2">{v.tanggal_pelayanan}</td>
                            <td className="px-3 py-2 font-mono">{v.no_registrasi}</td>
                            <td className="px-3 py-2">{v.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Visit detail modal dialog */}
      <AnimatePresence>
      {isVisitDetailModalOpen && selectedVisit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-xl rounded-2xl border border-slate-150 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-base">
                Detail Kunjungan: {selectedVisit.no_registrasi}
              </h3>
              <button 
                onClick={() => setIsVisitDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Tanggal</p>
                  <p className="font-semibold text-slate-800">{selectedVisit.tanggal_pelayanan}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Unit</p>
                  <p className="font-semibold text-slate-800">{selectedVisit.unit}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Triase</p>
                  <p className="font-semibold text-slate-800 capitalize">{selectedVisit.triase || 'Hijau'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Diagnosis (ICD-10)</p>
                  <p className="font-semibold text-slate-800">{selectedVisit.icd_kode || '-'}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3">Tindakan Dilakukan</h4>
                {(!selectedVisit.tindakan || selectedVisit.tindakan.length === 0) ? (
                  <p className="text-xs text-slate-500 italic">Tidak ada tindakan tercatat.</p>
                ) : (
                  <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Tindakan</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Pelaksana</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-500">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVisit.tindakan.map((t: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">{t.tindakan_nama}</td>
                            <td className="px-3 py-2">{t.pelaksana}</td>
                            <td className="px-3 py-2 text-right">Rp {t.subtotal?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Action modal dialog */}
      <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden"
          >
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
                  className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white disabled:bg-slate-50/50 disabled:text-slate-450"
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
                  className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formData.tanggal_lahir}
                    onChange={(e) => setFormData(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                    className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Jenis Kelamin</label>
                  <select
                    value={formData.jenis_kelamin}
                    onChange={(e) => setFormData(prev => ({ ...prev, jenis_kelamin: e.target.value as 'L' | 'P' }))}
                    className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Alamat</label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  className="w-full text-sm font-semibold border border-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none rounded-xl p-2.5 transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Kota</label>
                  <select
                    value={formData.kota_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, kota_id: parseInt(e.target.value) }))}
                    className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                  >
                    <option value={0}>Pilih Kota</option>
                    {kotaList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Kecamatan</label>
                  <select
                    value={formData.kecamatan_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, kecamatan_id: parseInt(e.target.value) }))}
                    className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                  >
                    <option value={0}>Pilih Kecamatan</option>
                    {kecamatanList.filter(kec => kec.kota_id === formData.kota_id).map(kec => <option key={kec.id} value={kec.id}>{kec.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 tracking-wider uppercase mb-1.5">Kelurahan</label>
                  <select
                    value={formData.kelurahan_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, kelurahan_id: parseInt(e.target.value) }))}
                    className="w-full text-sm font-semibold border border-slate-100 focus:border-teal-300 focus:ring-4 focus:ring-teal-500/5 outline-none rounded-xl p-2.5 transition bg-white"
                  >
                    <option value={0}>Pilih Kelurahan</option>
                    {kelurahanList.filter(kel => kel.kecamatan_id === formData.kecamatan_id).map(kel => <option key={kel.id} value={kel.id}>{kel.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100/70 flex items-center justify-end gap-3">
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
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
