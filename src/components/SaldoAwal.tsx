import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, Search, RefreshCw, CheckCircle, AlertCircle, Edit2, X, Info, Layers, TrendingUp, HelpCircle, ClipboardPaste, ArrowRight, Play } from 'lucide-react';
import api from '../services/api.js';

interface Medicine {
  id: number;
  kode_obat: string;
  nama_obat: string;
  golongan: string;
  satuan: string;
  kemasan: string;
  harga_satuan: number;
  saldo_awal_tahun: number | null;
  saldo_awal_bulan: number | null;
  saldo_awal_nilai: number;
  total_penerimaan: number;
  total_pemakaian: number;
  total_retur_hilang: number;
  stok_akhir: number;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function SaldoAwal() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form states for inline editing/configuring
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTahun, setEditTahun] = useState<number>(new Date().getFullYear());
  const [editBulan, setEditBulan] = useState<number>(new Date().getMonth() + 1);
  const [editNilai, setEditNilai] = useState<string>('');

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMonth, setImportMonth] = useState<number>(new Date().getMonth() + 1);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());

  const loadData = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.get('/obat/master');
      setMedicines(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal mengambil data obat dari database.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEdit = (med: Medicine) => {
    setEditingId(med.id);
    setEditTahun(med.saldo_awal_tahun || new Date().getFullYear());
    setEditBulan(med.saldo_awal_bulan || new Date().getMonth() + 1);
    setEditNilai(String(med.saldo_awal_nilai || 0));
  };

  const handleSave = async (id: number) => {
    if (!editTahun || !editBulan || editNilai === '') {
      setFeedback({ type: 'error', msg: 'Silakan isi parameter tahun, bulan, dan nilai saldo awal.' });
      return;
    }

    try {
      setFeedback(null);
      await api.post('/obat/saldo-awal', {
        obat_id: id,
        tahun: editTahun,
        bulan: editBulan,
        saldo_awal_nilai: Number(editNilai)
      });
      setFeedback({ type: 'success', msg: 'Saldo awal berhasil dikonfigurasi.' });
      setEditingId(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menyimpan saldo awal: ' + (err.response?.data?.message || err.message) });
    }
  };

  const handleParseImport = () => {
    if (!importText.trim()) {
      setFeedback({ type: 'error', msg: 'Teks import kosong.' });
      return;
    }

    setFeedback(null);
    const lines = importText.split('\n');
    let headerLineIdx = -1;
    let headers: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lowerLine = lines[i].toLowerCase();
      if ((lowerLine.includes('kode barang') || lowerLine.includes('kode obat') || lowerLine.includes('kode')) && 
          (lowerLine.includes('jumlah') || lowerLine.includes('qty') || lowerLine.includes('saldo'))) {
        headerLineIdx = i;
        break;
      }
    }

    if (headerLineIdx === -1) {
      setFeedback({ type: 'error', msg: 'Format tidak dikenali. Baris header dengan "Kode Barang" dan "Jumlah" tidak ditemukan.' });
      return;
    }

    // Detect separator: Tab is preferred
    const isTab = lines[headerLineIdx].includes('\t');
    if (isTab) {
      headers = lines[headerLineIdx].split('\t').map(h => h.trim().toLowerCase());
    } else {
      // try multi-space
      headers = lines[headerLineIdx].split(/\s{2,}/).map(h => h.trim().toLowerCase());
      if (headers.length < 2) {
        // fallback to single space
        headers = lines[headerLineIdx].split(/\s+/).map(h => h.trim().toLowerCase());
      }
    }

    const kodeIdx = headers.findIndex(h => h === 'kode barang' || h === 'kode obat' || h === 'kode' || h === 'kode_barang');
    const jumlahIdx = headers.findIndex(h => h === 'jumlah' || h === 'qty' || h === 'kuantitas' || h === 'saldo' || h === 'stok');
    const namaIdx = headers.findIndex(h => h === 'nama barang' || h === 'nama obat' || h === 'nama' || h === 'barang nama');

    if (kodeIdx === -1 || jumlahIdx === -1) {
      setFeedback({ type: 'error', msg: `Gagal mendeteksi kolom (Kode: ${kodeIdx}, Jumlah: ${jumlahIdx}). Pastikan kolom bernama "Kode Barang" dan "Jumlah".` });
      return;
    }

    const preview: any[] = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip lines that might just be unit names (e.g. APOTEK, INVENTORY)
      if (line.toUpperCase() === 'APOTEK' || line.toUpperCase() === 'INVENTORY' || line.toUpperCase() === 'GUDANG') continue;

      let cols: string[] = [];
      if (isTab) {
        cols = line.split('\t');
        // If it's just a single string without tabs in a tab-separated data, it's likely a unit name or header.
        if (cols.length === 1) continue; 
      } else {
        cols = line.split(/\s{2,}/);
        if (cols.length < Math.max(kodeIdx, jumlahIdx) + 1) {
          cols = line.split(/\s+/);
        }
        if (cols.length === 1) continue;
      }

      if (cols.length > Math.max(kodeIdx, jumlahIdx)) {
        const kode = cols[kodeIdx]?.trim();
        const rawJumlah = cols[jumlahIdx]?.trim() || '0';
        const jumlah = parseInt(rawJumlah.replace(/\./g, '').replace(/,/g, ''), 10);
        const nama = namaIdx !== -1 ? cols[namaIdx]?.trim() : '-';

        if (kode && !isNaN(jumlah)) {
          const matchedMed = medicines.find(m => m.kode_obat.toLowerCase() === kode.toLowerCase() || (nama !== '-' && m.nama_obat.toLowerCase() === nama.toLowerCase()));
          
          const existing = preview.find(p => p.kode.toLowerCase() === kode.toLowerCase());
          if (existing) {
            existing.jumlah += jumlah;
            existing.rawJumlah = existing.jumlah.toString();
          } else {
            preview.push({
              kode,
              nama,
              jumlah,
              rawJumlah: jumlah.toString(),
              matched: !!matchedMed,
              medicine: matchedMed
            });
          }
        }
      }
    }
    setImportPreview(preview);
  };

  const processImport = async () => {
    const validItems = importPreview.filter(p => p.matched && p.medicine);
    if (validItems.length === 0) {
      setFeedback({ type: 'error', msg: 'Tidak ada data valid yang bisa diproses.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    let successCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        await api.post('/obat/saldo-awal', {
          obat_id: item.medicine.id,
          tahun: importYear,
          bulan: importMonth,
          saldo_awal_nilai: item.jumlah
        });
        successCount++;
      } catch (e) {
        errorCount++;
      }
    }

    setIsProcessing(false);
    setShowImportModal(false);
    setImportText('');
    setImportPreview([]);
    setFeedback({ type: 'success', msg: `Import selesai: ${successCount} berhasil, ${errorCount} gagal.` });
    loadData();
  };

  const filteredMedicines = medicines.filter(m =>
    m.nama_obat.toLowerCase().includes(search.toLowerCase()) ||
    m.kode_obat.toLowerCase().includes(search.toLowerCase()) ||
    m.golongan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6" id="saldo-awal-container">
      {/* Informative Header Guide Card */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="p-3 bg-teal-600 rounded-xl text-white">
          <Layers className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-extrabold text-teal-900 tracking-tight">Aturan &amp; Mekanisme Saldo Awal Farmasi</h2>
          <p className="text-xs text-teal-700 font-medium leading-relaxed mt-1">
            Saldo awal adalah stok awal item obat di satu bulannya, yang hanya disetting <strong>1 kali di satu periode tahun</strong> (bebas mulai di bulan apa pun). 
            Nantinya, saldo awal ini akan berubah (bertambah/berkurang) secara otomatis seiring dengan adanya pencatatan transaksi masuk (penerimaan) dan keluar (pemakaian atau retur/hilang) obat farmasi.
          </p>
        </div>
      </div>

      {/* Main feedback alerts */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
            : 'bg-rose-50 border-rose-100 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="text-xs font-semibold">{feedback.msg}</span>
        </div>
      )}

      {/* Search and Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-white p-4 rounded-2xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau kode obat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{ minHeight: '40px' }}
          />
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ minHeight: '40px' }}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ minHeight: '40px' }}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste Data Excel
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memuat stok obat &amp; saldo awal...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Info Obat</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Golongan</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider text-center">Saldo Awal (A)</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Periode Mulai</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider text-center text-teal-600">Total Masuk (B)</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider text-center text-rose-600">Total Keluar (C)</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider text-center bg-teal-50/50 text-teal-800">Stok Akhir (A + B - C)</th>
                  <th className="px-4 py-3 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                      Tidak ada obat yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredMedicines.map((med) => {
                    const isEditing = editingId === med.id;
                    const isConfigured = med.saldo_awal_tahun !== null && med.saldo_awal_bulan !== null;

                    return (
                      <tr key={med.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Info Obat */}
                        <td className="px-4 py-3.5">
                          <span className="font-extrabold text-slate-800 text-xs block">{med.nama_obat}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{med.kode_obat} • {med.kemasan}</span>
                        </td>

                        {/* Golongan */}
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                          {med.golongan}
                        </td>

                        {/* Saldo Awal (Value) */}
                        <td className="px-4 py-3.5 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editNilai}
                              onChange={(e) => setEditNilai(e.target.value)}
                              className="w-24 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-teal-500/20"
                              placeholder="0"
                            />
                          ) : (
                            <span className="text-xs font-bold text-slate-800">
                              {med.saldo_awal_nilai}
                            </span>
                          )}
                        </td>

                        {/* Periode Mulai */}
                        <td className="px-4 py-3.5">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={editBulan}
                                onChange={(e) => setEditBulan(Number(e.target.value))}
                                className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                {MONTHS.map((m, idx) => (
                                  <option key={idx} value={idx + 1}>{m}</option>
                                ))}
                              </select>
                              <select
                                value={editTahun}
                                onChange={(e) => setEditTahun(Number(e.target.value))}
                                className="px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                {YEARS.map((y) => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                            </div>
                          ) : isConfigured ? (
                            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full inline-block">
                              {MONTHS[Number(med.saldo_awal_bulan) - 1]} {med.saldo_awal_tahun}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Belum Di-Set</span>
                          )}
                        </td>

                        {/* Total Masuk */}
                        <td className="px-4 py-3.5 text-center text-xs font-bold text-teal-600 font-mono">
                          +{med.total_penerimaan}
                        </td>

                        {/* Total Keluar */}
                        <td className="px-4 py-3.5 text-center text-xs font-bold text-rose-500 font-mono">
                          -{med.total_pemakaian + med.total_retur_hilang}
                        </td>

                        {/* Stok Akhir Terkini */}
                        <td className="px-4 py-3.5 text-center bg-teal-50/30">
                          {isConfigured ? (
                            <span className={`text-xs font-extrabold ${med.stok_akhir <= 5 ? 'text-rose-600' : 'text-teal-800'}`}>
                              {med.stok_akhir} <span className="text-[10px] font-normal text-slate-400">({med.satuan})</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">Atur Saldo Awal</span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleSave(med.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs font-medium transition-all"
                                title="Simpan"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg text-xs font-medium transition-all"
                                title="Batal"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(med)}
                              className="bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Set Saldo Awal</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    
      {/* Import Modal */}
      {showImportModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-teal-600" />
                Import Saldo Awal dari Excel
              </h3>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview([]);
                  setImportText('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-2xl text-xs space-y-2 border border-blue-100">
                <p className="font-semibold flex items-center gap-1.5"><Info className="h-4 w-4" /> Panduan Import</p>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  <li>Pastikan Anda menyalin (Copy) langsung dari tabel Excel.</li>
                  <li>Tabel <strong>wajib</strong> memiliki kolom dengan nama <strong>Kode Barang</strong> (atau Kode Obat) dan <strong>Jumlah</strong> (atau Saldo).</li>
                  <li>Sistem akan mencocokkan obat berdasarkan Kode Barang.</li>
                </ul>
              </div>

              <div className="flex gap-4 mb-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bulan Saldo</label>
                  <select 
                    value={importMonth}
                    onChange={e => setImportMonth(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tahun Saldo</label>
                  <select 
                    value={importYear}
                    onChange={e => setImportYear(Number(e.target.value))}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {importPreview.length === 0 ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Paste Text dari Excel</label>
                  <textarea
                    rows={8}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Barang Nama	Kode Barang	Satuan	...	Jumlah&#10;Abocath No. 16	10A0320	PCS	...	47"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleParseImport}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      Parse Data <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">Preview Import ({importPreview.length} baris dibaca)</h4>
                    <button
                      onClick={() => setImportPreview([])}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 underline"
                    >
                      Edit Teks
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-extrabold uppercase text-slate-500">Status</th>
                          <th className="px-3 py-2 text-[10px] font-extrabold uppercase text-slate-500">Kode Barang</th>
                          <th className="px-3 py-2 text-[10px] font-extrabold uppercase text-slate-500">Nama (di sistem)</th>
                          <th className="px-3 py-2 text-[10px] font-extrabold uppercase text-slate-500 text-right">Saldo Awal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className={item.matched ? 'bg-white' : 'bg-rose-50/50'}>
                            <td className="px-3 py-2">
                              {item.matched ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  <CheckCircle className="h-3 w-3" /> MATCH
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                  <X className="h-3 w-3" /> NOT FOUND
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs font-mono">{item.kode}</td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-700">{item.medicine?.nama_obat || item.nama}</td>
                            <td className="px-3 py-2 text-xs font-bold text-slate-900 text-right">{item.jumlah}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-emerald-600">{importPreview.filter(p => p.matched).length} valid</span> siap di-import
                    </div>
                    <button
                      onClick={processImport}
                      disabled={isProcessing || importPreview.filter(p => p.matched).length === 0}
                      className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Mulai Proses Import
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
