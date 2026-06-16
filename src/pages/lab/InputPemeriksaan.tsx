import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  FlaskConical, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Calculator, 
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../../services/api.js';
import { LabParameter } from '../../types.js';

export default function InputPemeriksaan() {
  const { user } = useAuthStore();
  
  // Parameters & loading states
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [loadingParams, setLoadingParams] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Date state: default to local Jakarta timezone formatted as YYYY-MM-DD
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Input quantities for Tab 1 (paramId -> value)
  const [quantities, setQuantities] = useState<{ [paramId: number]: string }>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch active parameters for record inputs
  const fetchActiveParameters = async () => {
    setLoadingParams(true);
    try {
      const res = await api.get('/lab/parameter');
      setParameters(res.data);
    } catch (err) {
      console.error('Failed to fetch active lab parameters', err);
    } finally {
      setLoadingParams(false);
    }
  };

  // Load initially
  useEffect(() => {
    fetchActiveParameters();
  }, []);

  // Fetch pre-existing daily lab counts for selected tanggal
  useEffect(() => {
    async function fetchDailyData() {
      if (parameters.length === 0) return;
      setLoadingData(true);
      setFeedback(null);
      try {
        const res = await api.get(`/lab/data?tanggal=${selectedDate}`);
        const dataRows: any[] = res.data;

        // Map parameter ID to quantity or empty string
        const quantityMap: { [id: number]: string } = {};
        parameters.forEach(p => {
          const match = dataRows.find(row => row.parameter_id === p.id);
          quantityMap[p.id] = match ? String(match.jumlah) : '';
        });

        setQuantities(quantityMap);
      } catch (err: any) {
        console.error('Failed to load lab data for date', err);
        setFeedback({ type: 'error', msg: 'Gagal mengunduh catatan harian: ' + err.message });
      } finally {
        setLoadingData(false);
      }
    }

    fetchDailyData();
  }, [selectedDate, parameters]);

  // Handle number strokes
  const handleInputChange = (paramId: number, val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setQuantities(prev => ({ ...prev, [paramId]: val }));
  };

  // Save Daily input
  const handleSaveDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Format payload
    const payload = Object.entries(quantities).map(([pid, qty]) => ({
      parameter_id: Number(pid),
      jumlah: qty === '' ? 0 : Number(qty)
    }));

    try {
      await api.post('/lab/data', {
        tanggal: selectedDate,
        data: payload
      });

      const indOption: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formattedIndDate = new Date(selectedDate).toLocaleDateString('id-ID', indOption);

      setFeedback({ 
        type: 'success', 
        msg: `Data pengujian pemeriksaan laboratorium untuk tanggal ${formattedIndDate} berhasil disimpan.` 
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({ 
        type: 'error', 
        msg: 'Gagal menyimpan data harian: ' + (err.response?.data?.message || err.message) 
      });
    } finally {
      setSaving(false);
    }
  };

  // Group active parameters by clinical category
  const categoriesMap: { [cat: string]: LabParameter[] } = {};
  parameters.forEach(p => {
    // skip placeholder parameter
    if (p.nama_parameter === '--- Parameter Awal ---') return;
    if (!categoriesMap[p.kategori]) {
      categoriesMap[p.kategori] = [];
    }
    categoriesMap[p.kategori].push(p);
  });

  const grandTotal = Object.values(quantities).reduce((sum, q) => sum + (q ? Number(q) : 0), 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 font-sans max-w-7xl mx-auto text-xs"
    >
      {/* Upper Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-teal-600" />
            <span>Entri Rekapitulasi Uji Laboratorium</span>
          </h1>
          <p className="text-slate-500 mt-0.5 text-xxs font-normal">
            Halaman pencatatan kuantitas harian pemeriksaan sampel klinik Puri Medika per tanggal pelayanan.
          </p>
        </div>
      </div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-xl border flex items-start space-x-2 text-xxs font-normal ${
            feedback.type === 'success' 
              ? 'bg-emerald-50/80 backdrop-blur-sm border-emerald-100 text-emerald-800' 
              : 'bg-rose-50/80 backdrop-blur-sm border-rose-100 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.msg}</span>
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Daily Date Selector with Today Quick Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pilih Hari Pengujian</span>
              <input
                id="daily-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-900 border-none bg-transparent focus:outline-none focus:ring-0 outline-none cursor-pointer mt-0.5"
                style={{ minHeight: '32px' }}
              />
            </div>
          </div>

          {/* Date Quick Controls */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateString())}
              className="text-xxs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-100/50 transition-colors cursor-pointer"
              style={{ minHeight: '32px' }}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                setSelectedDate(prev.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-medium text-slate-600 border border-slate-200 rounded-lg text-xxs transition-colors cursor-pointer"
              style={{ minHeight: '32px' }}
            >
              ◀ Kemarin
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                setSelectedDate(next.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 font-medium text-slate-600 border border-slate-200 rounded-lg text-xxs transition-colors cursor-pointer"
              style={{ minHeight: '32px' }}
            >
              Besok ▶
            </button>
          </div>
        </div>

        {/* LOADING PROGRESS AND PARAMETERS DRAW */}
        {loadingParams || loadingData ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 font-medium font-sans">
            <RefreshCw className="h-6 w-6 text-teal-650 animate-spin mx-auto mb-2" />
            <span>Sinkronisasi antarmuka dan data lab harian...</span>
          </div>
        ) : (
          <form onSubmit={handleSaveDaily} className="space-y-4">
            
            {/* Grid of clinical categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(categoriesMap).length > 0 ? (
                Object.entries(categoriesMap).map(([category, params]) => (
                  <div key={category} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold uppercase tracking-wider font-mono text-[9px] border border-slate-200/50">
                      {category}
                    </span>
                    
                    <div className="divide-y divide-slate-100">
                      {params.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0 gap-3">
                          <label htmlFor={`qty-${p.id}`} className="text-slate-700 font-medium hover:text-slate-900 cursor-pointer text-xxs flex-1 truncate">
                            {p.nama_parameter}
                          </label>
                          <input
                            id={`qty-${p.id}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={quantities[p.id] || ''}
                            onChange={(e) => handleInputChange(p.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg text-center w-16 font-mono text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
                            style={{ height: '28px' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                  Belum ada parameter pemeriksaan aktif. Silakan masuk ke submenu Master Pemeriksaan untuk mendaftarkan kategori uji klinis.
                </div>
              )}
            </div>

            {/* Total bottom accumulation bar */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-teal-600 rounded-xl text-white flex-shrink-0">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400 block">Total Akumulasi Harian ({selectedDate})</span>
                  <h3 className="text-sm font-semibold text-teal-300 font-mono mt-0.5">
                    {grandTotal} <span className="text-xxs text-slate-400 font-sans font-normal">Pemeriksaan Laboratorium</span>
                  </h3>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="save-daily-btn"
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-teal-600 hover:bg-teal-550 text-white font-medium py-2 px-5 rounded-xl shadow-xs transition-colors cursor-pointer text-xxs"
                  style={{ minHeight: '36px' }}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Transaksi Harian'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
