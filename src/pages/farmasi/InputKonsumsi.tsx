import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Pill, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Calculator, 
  ArrowRightLeft,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api.js';
import { ObatMaster, ObatKonsumsi } from '../../types.js';

export default function InputKonsumsi() {
  const { user } = useAuthStore();
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<{ [id: number]: boolean }>({});
  
  // Period states
  const d = new Date();
  const [selectedMonth, setSelectedMonth] = useState(d.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(2026); // Default seed year

  // Grid rows input state mapping obat_id to separate cells
  const [rowInputs, setRowInputs] = useState<{
    [id: number]: {
      stok_awal: string;
      penerimaan: string;
      pemakaian: string;
    };
  }>({});

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const months = [
    { value: 1, name: 'Januari' },
    { value: 2, name: 'Februari' },
    { value: 3, name: 'Maret' },
    { value: 4, name: 'April' },
    { value: 5, name: 'Mei' },
    { value: 6, name: 'Juni' },
    { value: 7, name: 'Juli' },
    { value: 8, name: 'Agustus' },
    { value: 9, name: 'September' },
    { value: 10, name: 'Oktober' },
    { value: 11, name: 'November' },
    { value: 12, name: 'Desember' }
  ];

  const years = [2024, 2025, 2026, 2027];

  // 1. Fetch medicines
  const loadMedicinesAndLogs = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      const [medRes, logsRes] = await Promise.all([
        api.get('/obat/master'),
        api.get(`/obat/request?bulan=${selectedMonth}&tahun=${selectedYear}`).catch(() => api.get(`/obat/konsumsi?bulan=${selectedMonth}&tahun=${selectedYear}`))
      ]);

      const activeMeds: ObatMaster[] = medRes.data.filter((m: ObatMaster) => m.is_active === 1);
      const existingLogs: ObatKonsumsi[] = logsRes.data;

      setMedicines(activeMeds);

      // Build row input mappings
      const initialMap: typeof rowInputs = {};
      activeMeds.forEach(m => {
        const match = existingLogs.find(log => log.obat_id === m.id);
        if (match) {
          initialMap[m.id] = {
            stok_awal: String(match.stok_awal),
            penerimaan: String(match.penerimaan),
            pemakaian: String(match.pemakaian)
          };
        } else {
          // Fallback guess: look at previous month sisa_stok as stok_awal
          initialMap[m.id] = {
            stok_awal: '',
            penerimaan: '',
            pemakaian: ''
          };
        }
      });

      setRowInputs(initialMap);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal mendownload data konsumsi obat.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicinesAndLogs();
  }, [selectedMonth, selectedYear]);

  const handleCellChange = (obatId: number, field: 'stok_awal' | 'penerimaan' | 'pemakaian', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setRowInputs(prev => ({
      ...prev,
      [obatId]: {
        ...prev[obatId],
        [field]: val
      }
    }));
  };

  const getSisaStok = (obatId: number) => {
    const inputs = rowInputs[obatId];
    if (!inputs) return 0;
    const sawal = inputs.stok_awal ? Number(inputs.stok_awal) : 0;
    const terima = inputs.penerimaan ? Number(inputs.penerimaan) : 0;
    const pakai = inputs.pemakaian ? Number(inputs.pemakaian) : 0;
    return sawal + terima - pakai;
  };

  // Save row
  const handleSaveRow = async (obatId: number) => {
    const inputs = rowInputs[obatId];
    if (!inputs) return;

    setSavingRows(prev => ({ ...prev, [obatId]: true }));
    setFeedback(null);

    const sawal = inputs.stok_awal === '' ? 0 : Number(inputs.stok_awal);
    const terima = inputs.penerimaan === '' ? 0 : Number(inputs.penerimaan);
    const pakai = inputs.pemakaian === '' ? 0 : Number(inputs.pemakaian);

    try {
      await api.post('/obat/konsumsi', {
        obat_id: obatId,
        bulan: selectedMonth,
        tahun: selectedYear,
        stok_awal: sawal,
        penerimaan: terima,
        pemakaian: pakai
      });

      // Show temporary single success
      const oName = medicines.find(m => m.id === obatId)?.nama_obat;
      setFeedback({ 
        type: 'success', 
        msg: `Laporan bulanan obat ${oName} disimpan. Sisa stok: ${sawal + terima - pakai} unit.` 
      });

    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menyimpan baris obat: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSavingRows(prev => ({ ...prev, [obatId]: false }));
    }
  };

  // Bulk save all rows
  const handleSaveAll = async () => {
    setLoading(true);
    setFeedback(null);
    let successCount = 0;
    let failedCount = 0;

    for (const med of medicines) {
      const inputs = rowInputs[med.id];
      if (!inputs) continue;
      const sawal = inputs.stok_awal === '' ? 0 : Number(inputs.stok_awal);
      const terima = inputs.penerimaan === '' ? 0 : Number(inputs.penerimaan);
      const pakai = inputs.pemakaian === '' ? 0 : Number(inputs.pemakaian);

      try {
        await api.post('/obat/konsumsi', {
          obat_id: med.id,
          bulan: selectedMonth,
          tahun: selectedYear,
          stok_awal: sawal,
          penerimaan: terima,
          pemakaian: pakai
        });
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    setLoading(false);
    if (failedCount === 0) {
      setFeedback({ type: 'success', msg: `Seluruh (${successCount}) rekap data konsumsi obat berhasil disimpan ke database.` });
    } else {
      setFeedback({ type: 'error', msg: `Berhasil menyimpan ${successCount} obat, tetapi ${failedCount} obat mengalami kegagalan.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Headers and controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Pill className="h-6 w-6 text-indigo-600" />
            <span>Form Pengisian Konsumsi Obat Bulanan</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Input lembar log arus obat berupa stok awal, penerimaan kargo suplai, serta pemakaian klinis rutin.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-xs">
          <Calendar className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <select 
            id="select-month-cons"
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm font-semibold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <span className="text-slate-300">|</span>
          <select 
            id="select-year-cons"
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-semibold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <div id="cons-feedback-alert" className={`p-4 rounded-xl border flex items-center space-x-2 text-sm font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <span>Sinkronisasi jurnal konsumsi logistik...</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-slate-500">Kode & Nama Obat</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-extrabold uppercase tracking-widest text-slate-500 w-28">Stok Awal</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-extrabold uppercase tracking-widest text-slate-500 w-28">Penerimaan</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-extrabold uppercase tracking-widest text-slate-500 w-28">Pemakaian</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-extrabold uppercase tracking-widest text-slate-500 w-32">Sisa Stok</th>
                    {(user?.role === 'admin' || user?.role === 'farmasi') && (
                      <th scope="col" className="px-6 py-4 text-right text-xs font-extrabold uppercase tracking-widest text-slate-500 w-24">Simpan</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold">
                  {medicines.map((m) => {
                    const inputs = rowInputs[m.id] || { stok_awal: '', penerimaan: '', pemakaian: '' };
                    const sisa = getSisaStok(m.id);
                    const isSaving = savingRows[m.id] || false;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-mono text-xxs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                              {m.kode_obat}
                            </span>
                            <h4 className="font-bold text-slate-900 mt-1.5 text-sm">{m.nama_obat}</h4>
                            <p className="text-xxs text-slate-400 font-medium mt-1 uppercase tracking-wider">{m.golongan} • {m.kemasan}</p>
                          </div>
                        </td>

                        {/* Stok Awal Input Cell */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <input
                            id={`sawal-${m.id}`}
                            type="text"
                            inputMode="numeric"
                            value={inputs.stok_awal}
                            onChange={(e) => handleCellChange(m.id, 'stok_awal', e.target.value)}
                            className="w-24 text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="0"
                          />
                        </td>

                        {/* Penerimaan Input Cell */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <input
                            id={`terima-${m.id}`}
                            type="text"
                            inputMode="numeric"
                            value={inputs.penerimaan}
                            onChange={(e) => handleCellChange(m.id, 'penerimaan', e.target.value)}
                            className="w-24 text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="0"
                          />
                        </td>

                        {/* Pemakaian Input Cell */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <input
                            id={`pakai-${m.id}`}
                            type="text"
                            inputMode="numeric"
                            value={inputs.pemakaian}
                            onChange={(e) => handleCellChange(m.id, 'pemakaian', e.target.value)}
                            className="w-24 text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            placeholder="0"
                          />
                        </td>

                        {/* Dynamically Calulcated Sisa Stok Cell */}
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={`text-base font-extrabold font-mono ${sisa < 10 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {sisa}
                          </span>
                        </td>

                        {/* Individual Save action */}
                        {(user?.role === 'admin' || user?.role === 'farmasi') && (
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              id={`save-row-${m.id}`}
                              onClick={() => handleSaveRow(m.id)}
                              disabled={isSaving}
                              className="p-2 bg-indigo-50 hover:bg-indigo-600 border border-indigo-250 text-indigo-700 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center mx-auto"
                              title="Simpan baris obat ini"
                              style={{ minHeight: '44px', minWidth: '44px' }}
                            >
                              <Save className="h-4.5 w-4.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sheet Bulk Submit controls */}
          {(user?.role === 'admin' || user?.role === 'farmasi') && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-600 text-white rounded-xl">
                  <Calculator className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">Lembar Form Konsumsi Obat Bulanan</h4>
                  <p className="text-xxs text-slate-400 mt-1">Anda dapat memperbarui semua data inventori dengan satu klik tindakan.</p>
                </div>
              </div>

              <button
                id="save-all-cons-btn"
                onClick={handleSaveAll}
                className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <Save className="h-5 w-5" />
                <span>Simpan Semua Perubahan</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
