import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { FlaskConical, Calendar, Save, RefreshCw, CheckCircle, Calculator, Info } from 'lucide-react';
import { motion } from 'motion/react';
import api from '../../services/api.js';
import { LabParameter, LabData } from '../../types.js';

export default function InputPemeriksaan() {
  const { user } = useAuthStore();
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Date states
  const d = new Date();
  const [selectedMonth, setSelectedMonth] = useState(d.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(2026); // Default seed year

  // Input states: Mapping parameter ID to quantity parsed
  const [quantities, setQuantities] = useState<{ [paramId: number]: string }>({});
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

  // 1. Fetch parameters
  useEffect(() => {
    async function fetchParameters() {
      try {
        const res = await api.get('/lab/parameter');
        setParameters(res.data);
      } catch (err) {
        console.error('Failed to fetch lab parameters', err);
      }
    }
    fetchParameters();
  }, []);

  // 2. Fetch any pre-existing lab quantities for current month-year selection
  useEffect(() => {
    async function fetchLabData() {
      if (parameters.length === 0) return;
      setLoading(true);
      setFeedback(null);
      try {
        const res = await api.get(`/lab/data?bulan=${selectedMonth}&tahun=${selectedYear}`);
        const dataRows: LabData[] = res.data;

        // Map parameter ID to its saved amount, or fall back to empty string
        const quantityMap: { [id: number]: string } = {};
        parameters.forEach(p => {
          const match = dataRows.find(row => row.parameter_id === p.id);
          quantityMap[p.id] = match ? String(match.jumlah) : '';
        });

        setQuantities(quantityMap);
      } catch (err: any) {
        console.error('Failed to load pre-existing lab data', err);
        setFeedback({ type: 'error', msg: 'Gagal sinkronisasi data pramusim: ' + err.message });
      } finally {
        setLoading(false);
      }
    }

    fetchLabData();
  }, [selectedMonth, selectedYear, parameters]);

  const handleInputChange = (paramId: number, val: string) => {
    // Only permit non-negative integers
    if (val !== '' && !/^\d+$/.test(val)) return;
    setQuantities(prev => ({ ...prev, [paramId]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Format data payload
    const payload = Object.entries(quantities).map(([pid, qty]) => ({
      parameter_id: Number(pid),
      jumlah: qty === '' ? 0 : Number(qty)
    }));

    try {
      await api.post('/lab/data', {
        bulan: selectedMonth,
        tahun: selectedYear,
        data: payload
      });
      setFeedback({ type: 'success', msg: `Laporan bulanan pemeriksaan laboratorium periode ${months.find(m => m.value === selectedMonth)?.name} ${selectedYear} sukses disimpan.` });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menyimpan laporan: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSaving(false);
    }
  };

  // Group parameters by clinical category
  const categoriesMap: { [cat: string]: LabParameter[] } = {};
  parameters.forEach(p => {
    if (!categoriesMap[p.kategori]) {
      categoriesMap[p.kategori] = [];
    }
    categoriesMap[p.kategori].push(p);
  });

  // Calculate subtotals and grand totals in real-time
  const getSubtotal = (catParams: LabParameter[]) => {
    return catParams.reduce((sum, p) => {
      const q = quantities[p.id];
      return sum + (q ? Number(q) : 0);
    }, 0);
  };

  const grandTotal = Object.values(quantities).reduce((sum, q) => sum + (q ? Number(q) : 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 font-sans"
    >
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5 font-display">
            <FlaskConical className="h-6 w-6 text-teal-600" />
            <span>Form Input Hasil Pemeriksaan Laboratorium</span>
          </h1>
          <p className="text-slate-550 mt-1 text-sm font-medium">
            Masukkan rekapitulasi volume pengujian lab berdasarkan parameter penunjang di Klinik Puri Medika.
          </p>
        </div>

        {/* Date period selector card */}
        <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-md px-4 py-1.5 border border-white/60 rounded-2xl shadow-sm text-slate-800">
          <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <select 
            id="select-month"
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-sm font-bold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>

          <span className="text-slate-300">|</span>

          <select 
            id="select-year"
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-sm font-bold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          id="save-feedback-alert" 
          className={`p-4 rounded-xl border flex items-start space-x-3 text-sm font-semibold ${
            feedback.type === 'success' 
              ? 'bg-emerald-50/80 backdrop-blur-sm border-emerald-150 text-emerald-800' 
              : 'bg-rose-50/80 backdrop-blur-sm border-rose-150 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </motion.div>
      )}

      {loading ? (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/60 p-12 text-center text-slate-500 text-sm">
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
          <span className="font-medium">Menghubungkan dan menarik audit parameter bulanan...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(categoriesMap).map(([category, catParams], catIdx) => (
              <motion.div 
                key={category} 
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="bg-white/70 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="bg-white/40 px-5 py-4 border-b border-slate-150/60 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-slate-850 tracking-wide font-display">
                      {category}
                    </h3>
                    <span className="text-xxs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 font-mono">
                      {catParams.length} Parameter
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100/50 px-5">
                    {catParams.map(param => (
                      <div key={param.id} className="py-3 flex items-center justify-between gap-4">
                        <label htmlFor={`param-${param.id}`} className="text-sm font-semibold text-slate-700 leading-relaxed cursor-pointer">
                          {param.nama_parameter}
                        </label>
                        <div className="relative rounded-xl w-28 flex-shrink-0">
                          <input
                            id={`param-${param.id}`}
                            type="text"
                            inputMode="numeric"
                            value={quantities[param.id] || ''}
                            onChange={(e) => handleInputChange(param.id, e.target.value)}
                            placeholder="0"
                            className="bg-white/50 border border-slate-200 rounded-xl text-slate-950 px-3 py-2 text-center text-sm font-bold font-mono focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 w-full transition-all"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotal Footer */}
                <div className="bg-white/30 py-3.5 px-5 border-t border-slate-100/50 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Subtotal {category}</span>
                  <span className="font-extrabold text-slate-800 font-mono text-sm">
                    {getSubtotal(catParams)} pengujian
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Grand totals and Submit Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-teal-600 rounded-xl text-white shadow-md">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xxs font-extrabold uppercase tracking-widest text-slate-400">Total Akumulasi Periode Ini</span>
                <h3 className="text-2xl font-black text-white font-mono mt-0.5">
                  {grandTotal} <span className="text-xs font-semibold text-slate-400">Pemeriksaan Lab</span>
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                id="save-lab-data-btn"
                type="submit"
                disabled={saving}
                className="w-full md:w-auto flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Semua Data'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
