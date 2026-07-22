import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '../../components/SearchableSelect.js';
import Swal from 'sweetalert2';
import { Plus, Trash2, Check, X, Map } from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'motion/react';

export default function MasterWilayah() {
  const [kota, setKota] = useState<any[]>([]);
  const [kecamatan, setKecamatan] = useState<any[]>([]);
  const [kelurahan, setKelurahan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [showAddKota, setShowAddKota] = useState(false);
  const [newKotaNama, setNewKotaNama] = useState('');

  const [showAddKecamatan, setShowAddKecamatan] = useState(false);
  const [newKecamatanNama, setNewKecamatanNama] = useState('');
  const [newKecamatanKotaId, setNewKecamatanKotaId] = useState('');

  const [showAddKelurahan, setShowAddKelurahan] = useState(false);
  const [newKelurahanNama, setNewKelurahanNama] = useState('');
  const [newKelurahanKecamatanId, setNewKelurahanKecamatanId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kR, kecR, kelR] = await Promise.all([
        api.get('/wilayah/kota'),
        api.get('/wilayah/kecamatan'),
        api.get('/wilayah/kelurahan')
      ]);
      setKota(kR.data || []);
      setKecamatan(kecR.data || []);
      setKelurahan(kelR.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Gagal mengambil data wilayah. Pastikan Anda masuk sebagai admin/perawat.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddKota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKotaNama.trim()) return;
    try {
      setError(null);
      await api.post('/wilayah/kota', { nama: newKotaNama.trim() });
      setNewKotaNama('');
      setShowAddKota(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan Kota.');
    }
  };

  const handleAddKecamatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKecamatanNama.trim() || !newKecamatanKotaId) return;
    try {
      setError(null);
      await api.post('/wilayah/kecamatan', { 
        nama: newKecamatanNama.trim(), 
        kota_id: parseInt(newKecamatanKotaId) 
      });
      setNewKecamatanNama('');
      setNewKecamatanKotaId('');
      setShowAddKecamatan(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan Kecamatan.');
    }
  };

  const handleAddKelurahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelurahanNama.trim() || !newKelurahanKecamatanId) return;
    try {
      setError(null);
      await api.post('/wilayah/kelurahan', { 
        nama: newKelurahanNama.trim(), 
        kecamatan_id: parseInt(newKelurahanKecamatanId) 
      });
      setNewKelurahanNama('');
      setNewKelurahanKecamatanId('');
      setShowAddKelurahan(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menambahkan Kelurahan.');
    }
  };

  const handleDelete = async (type: string, id: number) => {
    Swal.fire({
      title: 'Hapus Wilayah?',
      text: 'Apakah Anda yakin ingin menghapus data wilayah ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setError(null);
          await api.delete(`/wilayah/${type}/${id}`);
          await fetchData();
        } catch (err: any) {
          setError(err.response?.data?.message || `Gagal menghapus ${type}.`);
        }
      }
    });
  };

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
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Map className="h-5 w-5 text-teal-600" />
            Master Data Wilayah
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Kelola data kota, kecamatan, dan kelurahan untuk registrasi pasien.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
        >
          Refresh Data
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'height, opacity' }}
            className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-2 text-sm text-rose-700"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-3"></div>
          <span className="text-slate-500 text-sm font-medium">Memuat data wilayah...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUMN: KOTA */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.05 }}
            style={{ willChange: 'transform, opacity' }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col h-[650px]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-800 text-base">Kota ({kota.length})</h2>
              {!showAddKota && (
                <button 
                  onClick={() => setShowAddKota(true)}
                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              )}
            </div>

            {showAddKota && (
              <form onSubmit={handleAddKota} className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                <div className="mb-2.5">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Nama Kota</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Jakarta Selatan"
                    value={newKotaNama}
                    onChange={(e) => setNewKotaNama(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 rounded-xl p-2 transition"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddKota(false); setNewKotaNama(''); }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-500 rounded-lg"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="px-2.5 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto pr-1">
              {kota.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">Belum ada data kota.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                      <th className="pb-2">Nama Kota</th>
                      <th className="pb-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                    {kota.map((k, i) => (
                      <motion.tr 
                        key={k.id} 
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={itemVariants}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="hover:bg-slate-50/50 group"
                      >
                        <td className="py-2.5 font-medium text-slate-700">{k.nama}</td>
                        <td className="py-2.5 text-right">
                          <button 
                            onClick={() => handleDelete('kota', k.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition rounded-lg"
                            title="Hapus Kota"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* COLUMN: KECAMATAN */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.10 }}
            style={{ willChange: 'transform, opacity' }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col h-[650px]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-800 text-base">Kecamatan ({kecamatan.length})</h2>
              {!showAddKecamatan && (
                <button 
                  onClick={() => setShowAddKecamatan(true)}
                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              )}
            </div>

            {showAddKecamatan && (
              <form onSubmit={handleAddKecamatan} className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                <div className="mb-2">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Kota</label>
                  <SearchableSelect
                    required
                    value={newKecamatanKotaId}
                    onChange={(e) => setNewKecamatanKotaId(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 rounded-xl p-2 transition"
                  >
                    <option value="">Pilih Kota Induk</option>
                    {kota.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                  </SearchableSelect>
                </div>
                <div className="mb-2.5">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Nama Kecamatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kebayoran Baru"
                    value={newKecamatanNama}
                    onChange={(e) => setNewKecamatanNama(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 rounded-xl p-2 transition"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddKecamatan(false); setNewKecamatanNama(''); setNewKecamatanKotaId(''); }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-500 rounded-lg"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="px-2.5 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto pr-1">
              {kecamatan.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">Belum ada data kecamatan.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                      <th className="pb-2">Kecamatan</th>
                      <th className="pb-2">Kota</th>
                      <th className="pb-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                    {kecamatan.map((k, i) => (
                      <motion.tr 
                        key={k.id} 
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={itemVariants}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="hover:bg-slate-50/50 group"
                      >
                        <td className="py-2.5 font-medium text-slate-700">{k.nama}</td>
                        <td className="py-2.5 text-slate-500">{k.kota_nama || <span className="italic text-slate-400">Tidak ada</span>}</td>
                        <td className="py-2.5 text-right">
                          <button 
                            onClick={() => handleDelete('kecamatan', k.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition rounded-lg"
                            title="Hapus Kecamatan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

          {/* COLUMN: KELURAHAN */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
            style={{ willChange: 'transform, opacity' }}
            className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex flex-col h-[650px]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h2 className="font-bold text-slate-800 text-base">Kelurahan ({kelurahan.length})</h2>
              {!showAddKelurahan && (
                <button 
                  onClick={() => setShowAddKelurahan(true)}
                  className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 rounded-lg transition flex items-center gap-1 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              )}
            </div>

            {showAddKelurahan && (
              <form onSubmit={handleAddKelurahan} className="bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                <div className="mb-2">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Kecamatan</label>
                  <SearchableSelect
                    required
                    value={newKelurahanKecamatanId}
                    onChange={(e) => setNewKelurahanKecamatanId(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 rounded-xl p-2 transition"
                  >
                    <option value="">Pilih Kecamatan Induk</option>
                    {kecamatan.map(k => <option key={k.id} value={k.id}>{k.nama} ({k.kota_nama})</option>)}
                  </SearchableSelect>
                </div>
                <div className="mb-2.5">
                  <label className="block text-xs font-bold text-slate-500 tracking-wider uppercase mb-1">Nama Kelurahan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Senayan"
                    value={newKelurahanNama}
                    onChange={(e) => setNewKelurahanNama(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300 rounded-xl p-2 transition"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddKelurahan(false); setNewKelurahanNama(''); setNewKelurahanKecamatanId(''); }}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-500 rounded-lg"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="px-2.5 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="flex-1 overflow-y-auto pr-1">
              {kelurahan.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">Belum ada data kelurahan.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                      <th className="pb-2">Kelurahan</th>
                      <th className="pb-2">Kecamatan</th>
                      <th className="pb-2 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                    {kelurahan.map((k, i) => (
                      <motion.tr 
                        key={k.id} 
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={itemVariants}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="hover:bg-slate-50/50 group"
                      >
                        <td className="py-2.5 font-medium text-slate-700">{k.nama}</td>
                        <td className="py-2.5 text-slate-500">{k.kecamatan_nama || <span className="italic text-slate-400">Tidak ada</span>}</td>
                        <td className="py-2.5 text-right">
                          <button 
                            onClick={() => handleDelete('kelurahan', k.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition rounded-lg"
                            title="Hapus Kelurahan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}
