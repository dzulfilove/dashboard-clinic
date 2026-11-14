import React, { useState, useEffect } from 'react';
import { SearchableSelect } from '../../components/SearchableSelect.js';
import { useAuthStore } from '../../store/authStore.js';
import PageHeader from '../../components/PageHeader.js';
import { 
  TrendingUp, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Search, 
  ArrowUpDown,
  Package,
  Layers
} from 'lucide-react';
import api from '../../services/api.js';
import { ForecastResult } from '../../types.js';
import AnalyticLoader from '../../components/AnalyticLoader.js';

export default React.memo(function Forecasting() {
  useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isVisualizing, setIsVisualizing] = useState(true);
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Month-Year defaults for projected target period
  const d = new Date();
  const [projMonth, setProjMonth] = useState(d.getMonth() + 1);
  const [projYear, setProjYear] = useState(2026);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'need_order' | 'safe'>('all');
  const [kelasFilter, setKelasFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
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
      setFeedback('Gagal memuat data peramalan: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecastData();
  }, [projMonth, projYear]);

  useEffect(() => {
    setIsVisualizing(true);
    const timer = setTimeout(() => {
      setIsVisualizing(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [projMonth, projYear, statusFilter, kelasFilter, sortBy]);

  // Calculations
  const criticalItemsCount = forecasts.filter(f => (f.qty_order ?? 0) > 0).length;

  return (
    <div className="space-y-6 font-sans pb-10 text-[#0B1C30]">
      <PageHeader
        title="Peramalan Kebutuhan Obat (Forecasting)"
        subtitle="Proyeksi kebutuhan obat berbasis algoritma Moving Average (3 Bulan) dan penentuan Safety Stock & Reorder Point (ROP)."
      />

      {/* Period Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-[#516070]">
          Target proyeksi periode berjalan
        </span>
        <div className="flex items-center space-x-2 bg-white px-3.5 py-2 border border-[#E5EEFF] rounded-2xl shadow-sm">
          <Calendar className="h-4 w-4 text-[#213145] flex-shrink-0" />
          <span className="text-xs font-semibold text-[#516070]">Target:</span>
          <SearchableSelect
            id="proj-month-select"
            value={projMonth}
            onChange={(e) => setProjMonth(Number(e.target.value))}
            className="text-xs font-bold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </SearchableSelect>
          <span className="text-[#CCDCEF]">|</span>
          <SearchableSelect
            id="proj-year-select"
            value={projYear}
            onChange={(e) => setProjYear(Number(e.target.value))}
            className="text-xs font-bold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
            style={{ minHeight: '36px' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </SearchableSelect>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-[#FEF2F2] border border-[#EF4444]/30 text-[#B91C1C] rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <AlertTriangle className="h-4.5 w-4.5 text-[#EF4444]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Calculation Formula Callout (.si-alert--info) */}
      <div className="bg-[#EFF4FF] border border-[#CCDCEF] rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-[#516070]">
        <Info className="h-4.5 w-4.5 text-[#213145] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[#0B1C30] block">Rumus Perhitungan Peramalan Logistik &amp; Kebutuhan Order:</span>
          <p>
            1. <strong>Rata-rata Pemakaian:</strong> Pemakaian 3 bulan terakhir dibagi 3 (<code className="font-mono text-[#213145] font-semibold">Pemakaian ÷ 3</code>).
          </p>
          <p>
            2. <strong>Safety Stock (Stok Pengaman):</strong> Dihitung untuk mencegah kekosongan (<code className="font-mono text-[#213145] font-semibold">Rata-rata × 2</code>).
          </p>
          <p>
            3. <strong>Total Kebutuhan:</strong> Proyeksi kebutuhan periode depan (<code className="font-mono text-[#213145] font-semibold">Forecast Bulan 1 + 2 + 3</code>).
          </p>
          <p>
            4. <strong>Qty Order (Rencana Order):</strong> Kuantitas yang harus dipesan (<code className="font-mono text-[#213145] font-semibold">Total Kebutuhan + Safety Stock − Stok Akhir</code>).
          </p>
        </div>
      </div>

      {loading || isVisualizing ? (
        <AnalyticLoader message="Mengkalkulasi moving average & menganalisis safety stock..." />
      ) : (
        <div className="space-y-5">
          {/* 3. Quick KPI Cards (.si-card) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Critical Order Alerts */}
            <div className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex items-center justify-between border border-[#E5EEFF]">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${criticalItemsCount > 0 ? 'bg-[#FFE9E5] text-[#A13E32]' : 'bg-[#ECFDF5] text-[#047857]'}`}>
                  <AlertTriangle className={`h-6 w-6 ${criticalItemsCount > 0 ? 'text-[#FF8574]' : 'text-[#10B981]'}`} />
                </div>
                <div>
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase block">
                    STATUS REORDER OBAT
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className={`si-metric text-2xl font-extrabold font-display tabular-nums ${criticalItemsCount > 0 ? 'text-[#A13E32]' : 'text-[#0B1C30]'}`}>
                      {criticalItemsCount} Item
                    </span>
                    <span className="text-xs text-[#516070] font-medium">perlu pemesanan kembali (Qty Order &gt; 0)</span>
                  </div>
                </div>
              </div>
              <span className={`si-tag ${criticalItemsCount > 0 ? 'si-tag--coral' : 'si-tag--success'}`}>
                {criticalItemsCount > 0 ? 'Perlu Order' : 'Stok Terjaga'}
              </span>
            </div>

            {/* Card 2: Total Items */}
            <div className="si-card bg-white rounded-2xl p-5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex items-center justify-between border border-[#E5EEFF]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center shrink-0">
                  <Package className="h-6 w-6 text-[#213145]" />
                </div>
                <div>
                  <span className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase block">
                    TOTAL KATALOG AKTIF
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="si-metric text-2xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                      {forecasts.length} Item
                    </span>
                    <span className="text-xs text-[#516070] font-medium">terdata dalam simulasi logistik</span>
                  </div>
                </div>
              </div>
              <span className="si-tag si-tag--navy">
                Aktif
              </span>
            </div>
          </div>

          {/* 4. Filter & Search Panel (.si-card) */}
          <div className="si-card bg-white rounded-2xl p-4.5 shadow-[0_6px_24px_rgba(33,49,69,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#E5EEFF]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#74777C]" />
              </span>
              <input
                type="text"
                placeholder="Cari kode atau nama obat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-[#EFF4FF] hover:bg-[#E5EEFF] focus:bg-white border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] rounded-xl text-xs font-semibold text-[#0B1C30] placeholder-[#74777C] focus:outline-none focus:ring-3 focus:ring-[#CCDCEF] transition-all"
                style={{ minHeight: '40px' }}
              />
            </div>

            {/* Right Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Segmented Status Filter */}
              <div className="si-segment p-1 bg-[#EFF4FF] rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white text-[#213145] shadow-xs' : 'text-[#516070] hover:text-[#0B1C30]'}`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('need_order')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'need_order' ? 'bg-[#FF8574] text-[#222526] shadow-xs' : 'text-[#516070] hover:text-[#FF8574]'}`}
                >
                  Perlu Order
                </button>
                <button
                  onClick={() => setStatusFilter('safe')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === 'safe' ? 'bg-[#10B981] text-white shadow-xs' : 'text-[#516070] hover:text-[#10B981]'}`}
                >
                  Aman
                </button>
              </div>

              {/* Class Filter */}
              <div className="flex items-center space-x-1.5 bg-[#EFF4FF] px-3 py-2 rounded-xl text-xs">
                <Layers className="h-3.5 w-3.5 text-[#516070]" />
                <span className="font-semibold text-[#516070]">Kelas:</span>
                <select 
                  value={kelasFilter}
                  onChange={(e) => setKelasFilter(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-bold text-[#0B1C30] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua</option>
                  <option value="A">Kelas A</option>
                  <option value="B">Kelas B</option>
                  <option value="C">Kelas C</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center space-x-1.5 bg-[#EFF4FF] px-3 py-2 rounded-xl text-xs">
                <ArrowUpDown className="h-3.5 w-3.5 text-[#516070]" />
                <SearchableSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-[#0B1C30] focus:outline-none cursor-pointer"
                  style={{ minHeight: '24px' }}
                >
                  <option value="nama_asc">Nama Obat (A-Z)</option>
                  <option value="nama_desc">Nama Obat (Z-A)</option>
                  <option value="qty_order_desc">Kebutuhan Order (Tertinggi)</option>
                  <option value="stok_akhir_asc">Stok Akhir (Terendah)</option>
                  <option value="stok_akhir_desc">Stok Akhir (Tertinggi)</option>
                  <option value="pemakaian_desc">Pemakaian 3 Bln (Terbanyak)</option>
                </SearchableSelect>
              </div>
            </div>
          </div>

          {/* 5. Data Table (.si-table) */}
          <div className="si-card bg-white rounded-2xl overflow-hidden shadow-[0_6px_24px_rgba(33,49,69,0.06)] border border-[#E5EEFF] p-0">
            <div className="overflow-x-auto">
              <table className="si-table">
                <thead>
                  <tr>
                    <th>KODE &amp; NAMA OBAT</th>
                    <th className="text-center">KELAS ABC</th>
                    <th className="text-center">PEMAKAIAN 3 BLN</th>
                    <th className="text-center">RATA-RATA</th>
                    <th className="text-center">SAFETY STOCK</th>
                    <th className="text-center">FORECAST 1-3</th>
                    <th className="text-center">TOTAL KEBUTUHAN</th>
                    <th className="text-center">STOK AKHIR</th>
                    <th className="text-center bg-[#CCDCEF]/30 text-[#213145]">QTY ORDER</th>
                    <th className="text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EEFF] text-xs">
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
                      const matchesKelas = kelasFilter === 'ALL' || f.kelas_abc === kelasFilter;
                      return matchesSearch && matchesStatus && matchesKelas;
                    })
                    .sort((a, b) => {
                      if (sortBy === 'nama_asc') return a.nama_obat.localeCompare(b.nama_obat);
                      if (sortBy === 'nama_desc') return b.nama_obat.localeCompare(a.nama_obat);
                      if (sortBy === 'qty_order_desc') return (b.qty_order ?? 0) - (a.qty_order ?? 0);
                      if (sortBy === 'stok_akhir_asc') return (a.stok_akhir ?? a.current_stock ?? 0) - (b.stok_akhir ?? b.current_stock ?? 0);
                      if (sortBy === 'stok_akhir_desc') return (b.stok_akhir ?? b.current_stock ?? 0) - (a.stok_akhir ?? a.current_stock ?? 0);
                      if (sortBy === 'pemakaian_desc') return (b.pemakaian_3_bulan ?? 0) - (a.pemakaian_3_bulan ?? 0);
                      return 0;
                    })
                    .map((f) => {
                      const isNeedOrder = (f.qty_order ?? 0) > 0;
                      return (
                        <tr key={f.id} className="hover:bg-[#F8F9FF] transition-colors">
                          <td className="font-medium">
                            <span className="font-mono font-bold text-[11px] text-[#213145] bg-[#CCDCEF]/60 px-1.5 py-0.5 rounded">
                              {f.kode_obat}
                            </span>
                            <h4 className="font-bold text-[#0B1C30] mt-1 text-xs font-display">{f.nama_obat}</h4>
                          </td>

                          {/* Kelas ABC */}
                          <td className="text-center">
                            {f.kelas_abc ? (
                              <span className={`inline-flex items-center justify-center font-bold text-[11px] h-5.5 px-2 rounded-md ${
                                f.kelas_abc === 'A' 
                                  ? 'bg-[#FFE9E5] text-[#A13E32]' 
                                  : f.kelas_abc === 'B' 
                                    ? 'bg-[#FFFBEB] text-[#92400E]' 
                                    : 'bg-[#EFF4FF] text-[#516070]'
                              }`}>
                                Kelas {f.kelas_abc}
                              </span>
                            ) : (
                              <span className="text-[#74777C]">-</span>
                            )}
                          </td>

                          {/* Pemakaian 3 Bln */}
                          <td className="text-center font-mono text-xs text-[#0B1C30]">
                            {f.pemakaian_3_bulan ?? 0} <span className="text-[11px] text-[#74777C]">unit</span>
                          </td>

                          {/* Rata-rata */}
                          <td className="text-center font-mono text-xs text-[#0B1C30] bg-[#EFF4FF]/40">
                            {f.rata_rata ?? 0}
                          </td>

                          {/* Safety stock */}
                          <td className="text-center font-mono text-xs text-[#516070]">
                            {f.safety_stock ?? 0}
                          </td>

                          {/* Forecast Bulan 1-3 */}
                          <td className="text-center font-mono text-xs text-[#516070]">
                            <span className="inline-flex items-center space-x-1.5 bg-[#EFF4FF] px-2 py-0.5 rounded text-[11px]">
                              <span className="font-bold text-[#0B1C30]">{f.forecast_bulan_1 ?? 0}</span>
                              <span className="text-[#CCDCEF]">|</span>
                              <span className="font-bold text-[#0B1C30]">{f.forecast_bulan_2 ?? 0}</span>
                              <span className="text-[#CCDCEF]">|</span>
                              <span className="font-bold text-[#0B1C30]">{f.forecast_bulan_3 ?? 0}</span>
                            </span>
                          </td>

                          {/* Total Kebutuhan */}
                          <td className="text-center font-mono font-bold text-xs text-[#0B1C30]">
                            {f.total_kebutuhan ?? 0}
                          </td>

                          {/* Stok Akhir */}
                          <td className="text-center font-mono font-medium text-xs text-[#516070]">
                            {f.stok_akhir ?? f.current_stock ?? 0}
                          </td>

                          {/* Qty Order */}
                          <td className="text-center font-mono font-bold text-xs bg-[#CCDCEF]/25 text-[#213145]">
                            {f.qty_order ?? 0}
                          </td>

                          {/* Status */}
                          <td className="text-right">
                            <span className={`si-tag ${isNeedOrder ? 'si-tag--coral' : 'si-tag--success'}`}>
                              {isNeedOrder ? 'Perlu Order' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
