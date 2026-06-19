import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  TrendingDown,
  ChevronRight,
  Info
} from 'lucide-react';
import api from '../../services/api.js';
import { ForecastResult } from '../../types.js';

export default function Forecasting() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Month-Year defaults for projected target period
  const d = new Date();
  const [projMonth, setProjMonth] = useState(d.getMonth() + 1); // Defaults to current month
  const [projYear, setProjYear] = useState(2026); // Default seed year

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

  const loadForecastData = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.get(`/obat/forecast?bulan=${projMonth}&tahun=${projYear}`);
      setForecasts(res.data);
    } catch (err: any) {
      console.error(err);
      setFeedback('Gagal mendaftar data peramalan: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecastData();
  }, [projMonth, projYear]);

  // Calculations for total statistics
  const criticalItemsCount = forecasts.filter(f => f.status_stok === 'Kritis (Perlu Order)').length;

  // Prior month helpers (M-1, M-2, M-3)
  const getPrevMonthLabel = (offset: number) => {
    let b = projMonth - offset;
    let t = projYear;
    if (b <= 0) {
      b += 12;
      t--;
    }
    return `${months.find(m => m.value === b)?.name.substring(0, 3)} ${t}`;
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <span>Sistem Peramalan Logistik Farmasi (Forecasting)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Proyeksi kebutuhan obat berbasis algoritma <strong>Moving Average (3 Bulan)</strong> dan penentuan Tingkat Reorder Point (ROP).
          </p>
        </div>

        {/* Proyektif period selector */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-xs">
          <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-500">Proyeksi Target:</span>
          <select 
            id="proj-month-select"
            value={projMonth} 
            onChange={(e) => setProjMonth(Number(e.target.value))}
            className="text-sm font-semibold bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <span className="text-slate-300">|</span>
          <select 
            id="proj-year-select"
            value={projYear} 
            onChange={(e) => setProjYear(Number(e.target.value))}
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
        <div id="forecast-error-alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm font-semibold">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Forecasting Explanation Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex gap-3 text-xs leading-relaxed text-slate-600">
        <Info className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800 block mb-1">Rumus Perhitungan Peramalan Logistik & Kebutuhan Order:</span>
          <p className="mt-0.5">
            1. <strong>Rata-rata Pemakaian</strong> dihitung dari pemakaian 3 bulan sebelumnya: <strong className="text-slate-700 font-mono">Pemakaian 3 Bulan ÷ 3</strong>.
          </p>
          <p className="mt-1">
            2. <strong>Safety Stock (Stok Pengaman)</strong> dihitung untuk mencegah kekosongan obat: <strong className="text-slate-700 font-mono">Rata-rata Pemakaian × 2</strong>.
          </p>
          <p className="mt-1">
            3. <strong>Forecast Bulan 1-3</strong> diasumsikan bernilai konstan: <strong className="text-slate-700 font-mono">Rata-rata Pemakaian</strong>.
          </p>
          <p className="mt-1">
            4. <strong>Total Kebutuhan</strong> diproyeksikan untuk periode ke depan: <strong className="text-slate-700 font-mono">Forecast Bulan 1 + Forecast Bulan 2 + Forecast Bulan 3</strong>.
          </p>
          <p className="mt-1">
            5. <strong>Qty Order (Rencana Order)</strong> adalah kuantiti obat yang perlu dipesan kembali: <strong className="text-teal-700 font-mono">Total Kebutuhan + Safety Stock − Stok Akhir</strong>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
          <span>Mengkalkulasi moving average dan safety stocks...</span>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Quick Stats overview panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
               whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
               transition={{ duration: 0.2 }}
               className={`p-5 rounded-3xl border flex items-center space-x-4 bg-white/70 backdrop-blur-md shadow-sm ${criticalItemsCount > 0 ? 'border-rose-150/60' : 'border-slate-150/60'}`}
            >
              <div className={`p-4 rounded-2xl ${criticalItemsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Kekurangan Stok Terdeteksi</span>
                <span className={`text-sm font-black font-display block mt-1 ${criticalItemsCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {criticalItemsCount} item obat perlu pemesanan kembali (Qty Order &gt; 0)
                </span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
              transition={{ duration: 0.2 }}
              className="p-5 bg-white/70 backdrop-blur-md border border-slate-150/60 rounded-3xl shadow-sm flex items-center space-x-4"
            >
              <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Total Obat Diproyeksikan</span>
                <span className="text-sm font-black font-display text-slate-800 block mt-1">
                  {forecasts.length} item aktif
                </span>
              </div>
            </motion.div>
          </div>

          {/* Forecasting data table */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kode & Nama Obat</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Pemakaian 3 Bln</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Rata-rata</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Safety Stock</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Forecast Bln 1-3</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total Kebutuhan</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Stok Akhir</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-teal-50/50">Qty Order</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 text-xs font-normal">
                  {forecasts.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <div>
                          <span className="font-mono text-[9px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                            {f.kode_obat}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1 text-xs">{f.nama_obat}</h4>
                        </div>
                      </td>

                      {/* Pemakaian 3 Bln */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-700">
                        {f.pemakaian_3_bulan ?? 0} <span className="text-xxs font-normal text-slate-400">unit</span>
                      </td>

                      {/* Rata-rata */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-700 bg-slate-50/30 font-medium">
                        {f.rata_rata ?? 0} <span className="text-xxs font-normal text-slate-400">unit</span>
                      </td>

                      {/* Safety stock */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-600 font-medium">
                        {f.safety_stock ?? 0} <span className="text-xxs font-normal text-slate-300">unit</span>
                      </td>

                      {/* Forecast Bulan 1-3 */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-600">
                        <span className="inline-flex items-center space-x-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          <span className="font-bold text-slate-850">{f.forecast_bulan_1 ?? 0}</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-bold text-slate-850">{f.forecast_bulan_2 ?? 0}</span>
                          <span className="text-slate-300">|</span>
                          <span className="font-bold text-slate-850">{f.forecast_bulan_3 ?? 0}</span>
                        </span>
                      </td>

                      {/* Total Kebutuhan */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-slate-900 bg-slate-55/20">
                        {f.total_kebutuhan ?? 0} <span className="text-xxs font-normal text-slate-400">unit</span>
                      </td>

                      {/* Stok Akhir */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-medium text-purple-700 bg-purple-50/10">
                        {f.stok_akhir ?? f.current_stock ?? 0} <span className="text-xxs font-normal text-purple-400">unit</span>
                      </td>

                      {/* Qty Order */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-teal-800 bg-teal-50/60 border-x border-teal-100">
                        {f.qty_order ?? 0} <span className="text-xxs font-normal text-teal-400">unit</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 text-xxs font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          (f.qty_order ?? 0) > 0
                            ? 'bg-rose-100 text-rose-800 animate-pulse border border-rose-150'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-150'
                        }`}>
                          {(f.qty_order ?? 0) > 0 ? 'Perlu Order' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
