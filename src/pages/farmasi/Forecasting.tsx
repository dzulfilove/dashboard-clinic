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
  Info,
  Search,
  ArrowUpDown,
  Filter
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

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'need_order' | 'safe'>('all');
  const [sortBy, setSortBy] = useState<string>('nama_asc');

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
        <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-slate-100/80 rounded-2xl shadow-sm">
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
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4.5 flex gap-3 text-xs leading-relaxed text-slate-500 shadow-sm">
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
               whileHover={{ y: -2 }}
               transition={{ duration: 0.2 }}
               style={{ willChange: 'transform' }}
               className={`p-5 rounded-3xl border flex items-center space-x-4 bg-white/70 backdrop-blur-md shadow-sm ${criticalItemsCount > 0 ? 'border-rose-100' : 'border-slate-100'}`}
            >
              <div className={`p-4 rounded-2xl ${criticalItemsCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Kekurangan Stok Terdeteksi</span>
                <span className={`text-sm font-semibold font-display block mt-1 ${criticalItemsCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {criticalItemsCount} item obat perlu pemesanan kembali (Qty Order &gt; 0)
                </span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              style={{ willChange: 'transform' }}
              className="p-5 bg-white/70 backdrop-blur-md border border-slate-100 shadow-sm rounded-3xl flex items-center space-x-4"
            >
              <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Total Obat Diproyeksikan</span>
                <span className="text-sm font-semibold font-display text-slate-800 block mt-1">
                  {forecasts.length} item aktif
                </span>
              </div>
            </motion.div>
          </div>

          {/* Filters & Sorting Control Panel */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                placeholder="Cari nama atau kode obat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-300"
                style={{ minHeight: '40px' }}
              />
            </div>

            {/* Right side controls */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Status Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-850 shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('need_order')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'need_order' ? 'bg-rose-500 text-white shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-rose-600'}`}
                >
                  Perlu Order
                </button>
                <button
                  onClick={() => setStatusFilter('safe')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'safe' ? 'bg-emerald-600 text-white shadow-sm scale-[1.02]' : 'text-slate-500 hover:text-emerald-600'}`}
                >
                  Aman
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 border border-slate-100 rounded-2xl hover:bg-slate-100/50 transition-colors shadow-xs">
                <ArrowUpDown className="h-4 w-4 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  style={{ minHeight: '24px' }}
                >
                  <option value="nama_asc">Nama Obat (A-Z)</option>
                  <option value="nama_desc">Nama Obat (Z-A)</option>
                  <option value="qty_order_desc">Kebutuhan Order (Tertinggi)</option>
                  <option value="stok_akhir_asc">Stok Akhir (Terendah)</option>
                  <option value="stok_akhir_desc">Stok Akhir (Tertinggi)</option>
                  <option value="pemakaian_desc">Pemakaian 3 Bln (Terbanyak)</option>
                </select>
              </div>

            </div>
          </div>

          {/* Forecasting data table */}
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100/70 text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kode & Nama Obat</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Kelas ABC</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Pemakaian 3 Bln</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Rata-rata</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Safety Stock</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Forecast Bln 1-3</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total Kebutuhan</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Stok Akhir</th>
                    <th scope="col" className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-teal-50/30">Qty Order</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 text-slate-600 text-xs font-normal">
                  {forecasts
                    .filter((f) => {
                      const matchesSearch = 
                        (f.nama_obat || '').toLowerCase().includes(search.toLowerCase()) ||
                        (f.kode_obat || '').toLowerCase().includes(search.toLowerCase());
                      const needOrder = (f.qty_order ?? 0) > 0;
                      const matchesStatus = 
                        statusFilter === 'all' ||
                        (statusFilter === 'need_order' && needOrder) ||
                        (statusFilter === 'safe' && !needOrder);
                      return matchesSearch && matchesStatus;
                    })
                    .sort((a, b) => {
                      if (sortBy === 'nama_asc') {
                        return a.nama_obat.localeCompare(b.nama_obat);
                      }
                      if (sortBy === 'nama_desc') {
                        return b.nama_obat.localeCompare(a.nama_obat);
                      }
                      if (sortBy === 'qty_order_desc') {
                        return (b.qty_order ?? 0) - (a.qty_order ?? 0);
                      }
                      if (sortBy === 'stok_akhir_asc') {
                        const stockA = a.stok_akhir ?? a.current_stock ?? 0;
                        const stockB = b.stok_akhir ?? b.current_stock ?? 0;
                        return stockA - stockB;
                      }
                      if (sortBy === 'stok_akhir_desc') {
                        const stockA = a.stok_akhir ?? a.current_stock ?? 0;
                        const stockB = b.stok_akhir ?? b.current_stock ?? 0;
                        return stockB - stockA;
                      }
                      if (sortBy === 'pemakaian_desc') {
                        return (b.pemakaian_3_bulan ?? 0) - (a.pemakaian_3_bulan ?? 0);
                      }
                      return 0;
                    })
                    .map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="text-xs">
                            <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                              {f.kode_obat}
                            </span>
                            <h4 className="font-bold text-slate-900 mt-1 text-xs">{f.nama_obat}</h4>
                          </div>
                        </td>

                        {/* Kelas ABC */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {f.kelas_abc ? (
                            <span className={`inline-flex items-center justify-center font-semibold text-xs h-6 px-2.5 rounded-lg ${
                              f.kelas_abc === 'A' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                : f.kelas_abc === 'B' 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-150' 
                                  : 'bg-slate-50 text-slate-500 border border-slate-150'
                            }`}>
                              Kelas {f.kelas_abc}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>

                        {/* Pemakaian 3 Bln */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-700">
                          {f.pemakaian_3_bulan ?? 0} <span className="text-xs font-normal text-slate-400">unit</span>
                        </td>

                        {/* Rata-rata */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-700 bg-slate-50/30 font-medium">
                          {f.rata_rata ?? 0} <span className="text-xs font-normal text-slate-400">unit</span>
                        </td>

                        {/* Safety stock */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-600 font-medium">
                          {f.safety_stock ?? 0} <span className="text-xs font-normal text-slate-300">unit</span>
                        </td>

                        {/* Forecast Bulan 1-3 */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-xs text-slate-600">
                          <span className="inline-flex items-center space-x-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-xs">
                            <span className="font-bold text-slate-850">{f.forecast_bulan_1 ?? 0}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-bold text-slate-850">{f.forecast_bulan_2 ?? 0}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-bold text-slate-850">{f.forecast_bulan_3 ?? 0}</span>
                          </span>
                        </td>

                        {/* Total Kebutuhan */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-xs text-slate-900 bg-slate-55/20">
                          {f.total_kebutuhan ?? 0} <span className="text-xs font-normal text-slate-400">unit</span>
                        </td>

                        {/* Stok Akhir */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-medium text-xs text-purple-700 bg-purple-50/10">
                          {f.stok_akhir ?? f.current_stock ?? 0} <span className="text-xs font-normal text-purple-400">unit</span>
                        </td>

                        {/* Qty Order */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-xs text-teal-800 bg-teal-50/60 border-x border-teal-100">
                          {f.qty_order ?? 0} <span className="text-xs font-normal text-teal-400">unit</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider ${
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
