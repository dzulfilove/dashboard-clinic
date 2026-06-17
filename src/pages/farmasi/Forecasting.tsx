import { useState, useEffect } from 'react';
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
          <span className="font-bold text-slate-800 block mb-1">Cara Kerja Algoritma Peramalan & ROP:</span>
          <p className="mt-0.5">
            1. <strong>Proyeksi Kebutuhan</strong> dihitung berdasarkan rata-rata pemakaian obat pada 3 bulan sebelumnya: <strong className="text-slate-700 font-mono">[{getPrevMonthLabel(1)}, {getPrevMonthLabel(2)}, {getPrevMonthLabel(3)}]</strong>.
          </p>
          <p className="mt-1">
            2. <strong>Safety Stock (Stok Pengaman)</strong> dihitung untuk mengatasi fluktuasi suplai: <strong className="text-slate-700 font-mono">[Proyeksi Kebutuhan × (Lead Time Pengiriman / 30 Hari) × 1.5]</strong>.
          </p>
          <p className="mt-1">
            3. <strong>Reorder Quantity (ROP)</strong> adalah titik pemesanan kembali: <strong className="text-teal-700 font-mono">[Proyeksi Kebutuhan + Safety Stock]</strong>. Jika Stok Saat Ini di bawah ROP, maka ditandai <strong className="text-rose-600 uppercase">Kritis</strong>.
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
            <div className={`p-4 rounded-xl border flex items-center space-x-3 bg-white shadow-xs ${criticalItemsCount > 0 ? 'border-rose-150' : 'border-slate-150'}`}>
              <div className={`p-2.5 rounded-lg ${criticalItemsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xxs uppercase tracking-wider text-slate-400 block font-bold">Kekurangan Stok Terdeteksi</span>
                <span className={`text-base font-black font-mono block mt-0.5 ${criticalItemsCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {criticalItemsCount} item obat di bawah ROP
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-150 rounded-xl shadow-xs flex items-center space-x-3">
              <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xxs uppercase tracking-wider text-slate-400 block font-bold">Total Obat Diproyeksikan</span>
                <span className="text-base font-black font-mono text-slate-800 block mt-0.5">
                  {forecasts.length} item aktif
                </span>
              </div>
            </div>
          </div>

          {/* Forecasting data table */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kode & Nama Obat</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Proyeksi Demand (Suku 3 Bln)</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Safety Stock</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Reorder Point (ROP)</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Stok Saat Ini (Lokal)</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 text-xs font-normal">
                  {forecasts.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div>
                          <span className="font-mono text-xxs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                            {f.kode_obat}
                          </span>
                          <h4 className="font-medium text-slate-900 mt-1 text-xs">{f.nama_obat}</h4>
                          <p className="text-xxs text-slate-400 mt-0.5 font-medium">Lead Time Supplier: {f.lead_time_hari} Hari</p>
                        </div>
                      </td>

                      {/* Moving average demand */}
                      <td className="px-6 py-3 text-center whitespace-nowrap font-mono font-normal text-slate-700">
                        {f.proyeksi_kebutuhan} <span className="text-xxs font-normal text-slate-400">unit/bln</span>
                      </td>

                      {/* Safety stock */}
                      <td className="px-6 py-3 text-center whitespace-nowrap font-mono text-slate-500">
                        {f.safety_stock} <span className="text-xxs font-normal text-slate-300">unit</span>
                      </td>

                      {/* Reorder limit */}
                      <td className="px-6 py-3 text-center whitespace-nowrap font-mono font-medium text-teal-700 bg-teal-50/30">
                        {f.reorder_qty} <span className="text-xxs font-normal text-teal-400">unit</span>
                      </td>

                      {/* Current stock from latest month remaining */}
                      <td className="px-6 py-3 text-center whitespace-nowrap font-mono font-normal text-slate-600">
                        {f.current_stock} <span className="text-xxs font-normal text-slate-350">unit</span>
                      </td>

                      {/* ROP status tag */}
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 text-xxs font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          f.status_stok === 'Kritis (Perlu Order)'
                            ? 'bg-rose-100 text-rose-800 animate-pulse border border-rose-150'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-150'
                        }`}>
                          {f.status_stok === 'Kritis (Perlu Order)' ? 'Kritis' : 'Aman'}
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
