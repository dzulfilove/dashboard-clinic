import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
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
  RefreshCw
} from 'lucide-react';
import api from '../../services/api.js';
import { ObatMaster } from '../../types.js';

export default function MasterObat() {
  const { user } = useAuthStore();
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isActive, setIsActive] = useState(1);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Load medicines catalog
  const loadMedicines = async () => {
    try {
      setLoading(true);
      const res = await api.get('/obat/master');
      setMedicines(res.data);
    } catch (err: any) {
      console.error('Failed to load medicines list', err);
      setFeedback({ type: 'error', msg: 'Gagal mendownload data master obat dari server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // Filter medicines
  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.nama_obat.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          med.kode_obat.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGolongan = selectedGolongan === 'Semua' || med.golongan === selectedGolongan;
    return matchesSearch && matchesGolongan;
  });

  // Extract distinct drug classes for filters
  const golonganOptions = ['Semua', ...Array.from(new Set(medicines.map(m => m.golongan).filter(Boolean)))];

  const handleOpenAddForm = () => {
    setEditId(null);
    setKodeObat(`OBT-${Math.floor(1000 + Math.random() * 9000)}`);
    setNamaObat('');
    setGolongan('');
    setSatuan('Tablet');
    setKemasan('DUS / 10 Strips');
    setHargaSatuan('');
    setLeadTime('2');
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

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" />
            <span>Master Data Katalog Obat</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Daftar pengenalan stok, golongan dosis, unit kemasan, dan patokan harga obat di Klinik Puri Medika.
          </p>
        </div>

        {/* Action button */}
        {(user?.role === 'admin' || user?.role === 'farmasi') && (
          <button
            id="add-obat-btn"
            onClick={handleOpenAddForm}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-5 rounded-xl shadow-md transition-all cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <Plus className="h-5 w-5" />
            <span>Tambah Obat Baru</span>
          </button>
        )}
      </div>

      {feedback && (
        <div id="obat-feedback-alert" className={`p-4 rounded-xl border flex items-center space-x-2 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Dynamic Input/Edit Block Form Drawer style */}
      {isFormOpen && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-extrabold text-indigo-400">
              {editId ? `Ubah Data Obat: ${kodeObat}` : 'Tambah Katalog Obat Baru'}
            </h2>
            <button 
              id="close-obat-form-btn"
              onClick={() => setIsFormOpen(false)} 
              className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveObat} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="kode" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Kode Obat</label>
              <input
                id="kode"
                type="text"
                required
                value={kodeObat}
                onChange={(e) => setKodeObat(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500/35"
              />
            </div>

            <div>
              <label htmlFor="nama" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap Obat</label>
              <input
                id="nama"
                type="text"
                required
                placeholder="ex: Paracetamol 500mg"
                value={namaObat}
                onChange={(e) => setNamaObat(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35"
              />
            </div>

            <div>
              <label htmlFor="golongan" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Golongan Obat</label>
              <input
                id="golongan"
                type="text"
                placeholder="ex: Obat Keras, Tablet Bebas, Vitamin"
                value={golongan}
                onChange={(e) => setGolongan(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35"
              />
            </div>

            <div>
              <label htmlFor="satuan" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Satuan Penunjuk</label>
              <input
                id="satuan"
                type="text"
                placeholder="ex: Tablet, Kapsul, Botol, Pcs"
                value={satuan}
                onChange={(e) => setSatuan(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35"
              />
            </div>

            <div>
              <label htmlFor="kemasan" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Kemasan Box</label>
              <input
                id="kemasan"
                type="text"
                placeholder="ex: DUS / 10 Strips"
                value={kemasan}
                onChange={(e) => setKemasan(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35"
              />
            </div>

            <div>
              <label htmlFor="harga" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Harga Satuan (Rp)</label>
              <div className="relative mt-1.5 rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-sm font-mono">Rp</span>
                </div>
                <input
                  id="harga"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={hargaSatuan}
                  onChange={(e) => setHargaSatuan(e.target.value)}
                  className="pl-9 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35 font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="leadtime" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Time Delivery (Hari)</label>
              <input
                id="leadtime"
                type="number"
                min="1"
                required
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35 font-mono"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Status Diaktifkan</label>
              <select
                id="status"
                value={isActive}
                onChange={(e) => setIsActive(Number(e.target.value))}
                className="mt-1.5 block w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-indigo-500/35 cursor-pointer"
                style={{ minHeight: '44px' }}
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
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold"
                style={{ minHeight: '44px' }}
              >
                Batalkan
              </button>
              <button
                id="submit-obat-btn"
                type="submit"
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer text-sm"
                style={{ minHeight: '44px' }}
              >
                <Save className="h-4.5 w-4.5" />
                <span>Simpan Katalog</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Searching & Filter tool rails */}
      <div className="bg-white p-4 border border-slate-150 shadow-xs rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative rounded-xl shadow-xs w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <input
            id="search-obat"
            type="text"
            placeholder="Cari berdasarkan nama/kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Layers className="h-4.5 w-4.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Filter Golongan:</span>
          <select
            id="filter-golongan"
            value={selectedGolongan}
            onChange={(e) => setSelectedGolongan(e.target.value)}
            className="text-xs font-bold bg-slate-100 border-none text-slate-700 px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            {golonganOptions.map((g, idx) => (
              <option key={idx} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog lists table */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Kode</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Obat</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Golongan</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Harga Satuan</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Lead Time</th>
                <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Status</th>
                {(user?.role === 'admin' || user?.role === 'farmasi') && (
                  <th scope="col" className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-widest text-slate-500">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin mx-auto mb-2" />
                    <span>Sinkronisasi katalog...</span>
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                    Tidak ditemukan obat yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200/60 font-bold">
                        {m.kode_obat}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{m.nama_obat}</div>
                        <div className="text-xxs text-slate-500 mt-1 font-medium">{m.kemasan} ({m.satuan})</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider font-bold">
                        {m.golongan}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      Rp {Number(m.harga_satuan).toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                      {m.lead_time_hari} Hari
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 text-xxs font-bold px-2 py-0.5 rounded-full ${
                        m.is_active === 1 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${m.is_active === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span>{m.is_active === 1 ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </td>
                    {(user?.role === 'admin' || user?.role === 'farmasi') && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            id={`edit-obat-${m.id}`}
                            onClick={() => handleOpenEditForm(m)}
                            className="p-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 font-bold text-xs flex items-center space-x-1"
                            title="Edit obat"
                            style={{ minHeight: '32px' }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
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
                            style={{ minHeight: '32px' }}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>{m.is_active === 1 ? 'Tangguhkan' : 'Aktifkan'}</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
