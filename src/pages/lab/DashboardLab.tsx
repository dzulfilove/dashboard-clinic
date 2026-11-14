import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SearchableSelect } from '../../components/SearchableSelect.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  TrendingUp,
  Download,
  FlaskConical,
  Award,
  AlertCircle,
  Calendar,
  Layers,
  ArrowDown,
  Activity,
  Layers3,
  Dna,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { useRecharts } from '../../components/RechartsLoader.js';
import api from '../../services/api.js';
import { LabData } from '../../types.js';
import AnalyticLoader from '../../components/AnalyticLoader.js';
import { MONTHS_ID } from '../../utils/dateFormat.js';

const YEARS = [2024, 2025, 2026, 2027];

// Slate & Ice v2.0 cohesive data visualization palette
const CHART_COLORS = [
  '#213145', // Brand Navy
  '#4F7CAC', // Steel Blue
  '#FF8574', // Coral Accent
  '#7C96B8', // Ice Slate
  '#334E68', // Deep Slate
  '#94A3B8', // Cool Gray
  '#10B981'  // Emerald Semantic
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
  }>;
  label?: string;
  unit?: string;
}

function SlateTooltip({ active, payload, label, unit = 'uji' }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#213145] text-white px-3.5 py-2.5 rounded-xl shadow-[0_12px_32px_rgba(11,28,48,0.24)] text-xs min-w-[140px]">
      {label && (
        <p className="font-semibold text-[#CCDCEF] mb-1.5 pb-1 border-b border-white/10">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-white/90">
              <span
                className="w-2 h-2 rounded-full flex-none"
                style={{ backgroundColor: entry.color || '#CCDCEF' }}
              />
              <span className="truncate max-w-[140px]">{entry.name}</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-white">
              {Number(entry.value || 0).toLocaleString('id-ID')} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(function DashboardLab() {
  const { user } = useAuthStore();
  const recharts = useRecharts();
  const BarChart = recharts?.BarChart;
  const Bar = recharts?.Bar;
  const XAxis = recharts?.XAxis;
  const YAxis = recharts?.YAxis;
  const CartesianGrid = recharts?.CartesianGrid;
  const Tooltip = recharts?.Tooltip;
  const Legend = recharts?.Legend;
  const ResponsiveContainer = recharts?.ResponsiveContainer;
  const PieChart = recharts?.PieChart;
  const Pie = recharts?.Pie;
  const Cell = recharts?.Cell;
  const AreaChart = recharts?.AreaChart;
  const Area = recharts?.Area;

  const [loading, setLoading] = useState(true);
  const [labData, setLabData] = useState<LabData[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sub-navigation tabs
  const [subTab, setSubTab] = useState<'overview' | 'category' | 'progress'>('overview');

  // Daily parameter timeline for granular progression
  const [dailyProgressData, setDailyProgressData] = useState<any[]>([]);
  const [selectedProgressParam, setSelectedProgressParam] = useState<number | null>(null);
  const [progressSearch, setProgressSearch] = useState('');

  // Selected Category for Detailed Dashboard
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Month-Year period range selector state
  const d = new Date();
  const [startMonth, setStartMonth] = useState(1);
  const [startYear, setStartYear] = useState(2026);
  const [endMonth, setEndMonth] = useState(d.getMonth() + 1);
  const [endYear, setEndYear] = useState(2026);

  const months = useMemo(
    () => MONTHS_ID.map((name, idx) => ({ value: idx + 1, name })),
    []
  );
  const years = YEARS;

  // Format raw database flat records to Recharts multi-series timeline data
  const processTrendData = useCallback(
    (rawTrends: any[], sM = 1, sY = 2026, eM = 12, eY = 2026) => {
      const timelineMap: { [key: string]: any } = {};

      rawTrends.forEach((row: any) => {
        const monthObj = months.find((m) => m.value === row.bulan);
        const label = `${monthObj ? monthObj.name.substring(0, 3) : row.bulan} ${row.tahun}`;
        const periodKey = `${row.tahun}-${String(row.bulan).padStart(2, '0')}`;

        if (!timelineMap[periodKey]) {
          timelineMap[periodKey] = {
            name: label,
            sortKey: periodKey,
            Total: 0
          };
        }

        const categoryName = String(row.kategori || 'LAINNYA').toUpperCase();
        timelineMap[periodKey][categoryName] =
          (timelineMap[periodKey][categoryName] || 0) + Number(row.total);
        timelineMap[periodKey].Total += Number(row.total);
      });

      const startKey = `${sY}-${String(sM).padStart(2, '0')}`;
      const endKey = `${eY}-${String(eM).padStart(2, '0')}`;

      const sortedList = Object.values(timelineMap)
        .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
        .filter((item: any) => item.sortKey >= startKey && item.sortKey <= endKey);

      setTrendData(sortedList);
    },
    [months]
  );

  // Fetch Laboratory volumes and history trend curves
  useEffect(() => {
    async function fetchLabAnalytics() {
      const isRangeValid =
        startYear < endYear || (startYear === endYear && startMonth <= endMonth);
      if (!isRangeValid) {
        setFeedback(
          'Rentang tanggal tidak valid. Bulan Selesai harus sesudah atau sama dengan Bulan Mulai.'
        );
        setLabData([]);
        setTrendData([]);
        setDailyProgressData([]);
        setLoading(false);
        return;
      }
      setFeedback(null);

      try {
        setLoading(true);
        const [dataRes, trendRes, progressRes] = await Promise.all([
          api.get(
            `/lab/data?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`
          ),
          api.get('/lab/tren'),
          api.get(
            `/lab/parameter-harian?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`
          )
        ]);

        setLabData(dataRes.data);
        processTrendData(trendRes.data, startMonth, startYear, endMonth, endYear);
        setDailyProgressData(progressRes.data || []);
      } catch (err: any) {
        console.error('Failed to pull lab dashboard stats', err);
        setFeedback('Gagal menghubungi API server untuk analisis laboratorium.');
      } finally {
        setLoading(false);
      }
    }

    fetchLabAnalytics();
  }, [startMonth, startYear, endMonth, endYear, processTrendData]);

  // Default selected category once labData is loaded
  useEffect(() => {
    if (labData.length > 0 && !activeCategory) {
      const uniqueCats = Array.from(
        new Set(labData.map((item) => item.kategori).filter(Boolean))
      );
      if (uniqueCats.length > 0) {
        setActiveCategory(uniqueCats[0]);
      }
    }
  }, [labData, activeCategory]);

  const getDaysInRangeCount = useCallback(() => {
    const sD = new Date(startYear, startMonth - 1, 1);
    const eD = new Date(endYear, endMonth, 0);
    const diffTime = Math.abs(eD.getTime() - sD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 30;
  }, [startYear, startMonth, endYear, endMonth]);

  // Daily progression list
  const progressList = useMemo(() => {
    const grouped: {
      [id: number]: {
        id: number;
        nama_parameter: string;
        kategori: string;
        total: number;
        activeDays: number;
        maxCount: number;
        maxDate: string;
        dailySeries: { tanggal: string; jumlah: number }[];
      };
    } = {};

    labData.forEach((p) => {
      grouped[p.parameter_id] = {
        id: p.parameter_id,
        nama_parameter: p.nama_parameter,
        kategori: p.kategori,
        total: p.jumlah,
        activeDays: 0,
        maxCount: 0,
        maxDate: '-',
        dailySeries: []
      };
    });

    dailyProgressData.forEach((row: any) => {
      const pId = row.parameter_id;
      if (!grouped[pId]) {
        grouped[pId] = {
          id: pId,
          nama_parameter: row.nama_parameter,
          kategori: row.kategori,
          total: 0,
          activeDays: 0,
          maxCount: 0,
          maxDate: '-',
          dailySeries: []
        };
      }

      grouped[pId].dailySeries.push({
        tanggal: row.tanggal,
        jumlah: Number(row.jumlah || 0)
      });

      if (Number(row.jumlah) > 0) {
        grouped[pId].activeDays += 1;
        if (Number(row.jumlah) > grouped[pId].maxCount) {
          grouped[pId].maxCount = Number(row.jumlah);
          try {
            const dateObj = new Date(row.tanggal);
            grouped[pId].maxDate = dateObj.toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short'
            });
          } catch {
            grouped[pId].maxDate = row.tanggal;
          }
        }
      }
    });

    Object.values(grouped).forEach((g) => {
      g.dailySeries.sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
      );
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [labData, dailyProgressData]);

  // Overall KPIs
  const totalExams = useMemo(
    () => labData.reduce((sum, item) => sum + item.jumlah, 0),
    [labData]
  );

  const sortedParams = useMemo(
    () => [...labData].sort((a, b) => b.jumlah - a.jumlah),
    [labData]
  );
  const peakParameter = sortedParams[0];
  const lowParameter = sortedParams.filter((item) => item.jumlah > 0).pop();

  // Category breakdown
  const categoryChartData = useMemo(() => {
    const map: { [cat: string]: number } = {};
    labData.forEach((item) => {
      const key = item.kategori || 'LAIN-LAIN';
      map[key] = (map[key] || 0) + item.jumlah;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [labData]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(labData.map((item) => item.kategori).filter(Boolean))),
    [labData]
  );

  const comparisonChartData = useMemo(
    () =>
      categoryChartData.map((cat, idx) => ({
        name: cat.name,
        'Jumlah Pengujian': cat.value,
        color: CHART_COLORS[idx % CHART_COLORS.length]
      })),
    [categoryChartData]
  );

  // Extract active trend categories sorted by overall volume
  const trendCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    trendData.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (key !== 'name' && key !== 'sortKey' && key !== 'Total') {
          totals[key] = (totals[key] || 0) + Number(point[key] || 0);
        }
      });
    });
    return Object.entries(totals)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);
  }, [trendData]);

  // Category-specific metrics
  const categorySpecificParams = useMemo(
    () =>
      labData
        .filter((item) => item.kategori === activeCategory)
        .sort((a, b) => b.jumlah - a.jumlah),
    [labData, activeCategory]
  );
  const categoryTotal = useMemo(
    () => categorySpecificParams.reduce((sum, item) => sum + item.jumlah, 0),
    [categorySpecificParams]
  );
  const categoryPeakParam = categorySpecificParams[0];
  const categoryContributionPercent =
    totalExams > 0 ? Math.round((categoryTotal / totalExams) * 100) : 0;
  const topTenCategoryParams = useMemo(
    () => categorySpecificParams.slice(0, 10),
    [categorySpecificParams]
  );

  const filteredProgressItems = useMemo(() => {
    const query = progressSearch.trim().toLowerCase();
    if (!query) return progressList;
    return progressList.filter(
      (item) =>
        item.nama_parameter.toLowerCase().includes(query) ||
        item.kategori.toLowerCase().includes(query)
    );
  }, [progressList, progressSearch]);

  const activeProgressParamId =
    selectedProgressParam || filteredProgressItems[0]?.id || progressList[0]?.id;
  const activeProgressParam = progressList.find(
    (p) => p.id === activeProgressParamId
  );

  const startPeriodLabel = `${months[startMonth - 1]?.name || ''} ${startYear}`;
  const endPeriodLabel = `${months[endMonth - 1]?.name || ''} ${endYear}`;

  const handleExportXlsx = () => {
    window.open(
      `/api/lab/export?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`,
      '_blank'
    );
  };

  return (
    <div className="space-y-6 font-sans text-[#222526] pb-10">
      {/* 1. Header & Period Controls */}
      <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 shadow-[0_6px_24px_rgba(33,49,69,0.06)] space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1C30] tracking-tight font-display">
              Tren &amp; Analisis Laboratorium
            </h1>
            <p className="text-xs text-[#516070] font-medium">
              Periode {startPeriodLabel} – {endPeriodLabel} ·{' '}
              <span className="tabular-nums font-semibold text-[#213145]">
                {totalExams.toLocaleString('id-ID')} pengujian
              </span>{' '}
              · {uniqueCategories.length} kategori aktif
            </p>
          </div>

          {/* Date range period selector & export action */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex flex-wrap items-center gap-2 bg-[#EFF4FF] px-3 py-1.5 border border-[#D3E4FE] rounded-xl">
              <Calendar className="h-4 w-4 text-[#213145] flex-none" />
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-[#516070]">Dari</span>
                <SearchableSelect
                  id="select-start-month-anal"
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="text-xs font-semibold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
                  style={{ minHeight: '34px' }}
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </SearchableSelect>
                <SearchableSelect
                  id="select-start-year-anal"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="text-xs font-semibold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
                  style={{ minHeight: '34px' }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SearchableSelect>
              </div>

              <span className="text-[#B8C8DB]">/</span>

              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-[#516070]">Selesai</span>
                <SearchableSelect
                  id="select-end-month-anal"
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                  className="text-xs font-semibold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
                  style={{ minHeight: '34px' }}
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </SearchableSelect>
                <SearchableSelect
                  id="select-end-year-anal"
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="text-xs font-semibold bg-transparent border-none text-[#0B1C30] focus:outline-none cursor-pointer"
                  style={{ minHeight: '34px' }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </SearchableSelect>
              </div>
            </div>

            {user?.role === 'admin' && (
              <button
                id="export-lab-btn"
                onClick={handleExportXlsx}
                className="si-btn si-btn--primary text-xs font-semibold px-4 rounded-xl whitespace-nowrap shrink-0"
                style={{ height: '40px' }}
              >
                <Download className="h-4 w-4 text-white" />
                <span>Unduh Rekap</span>
              </button>
            )}
          </div>
        </div>

        {/* Segmented Sub-Navigation */}
        <div className="pt-4 border-t border-[#E5EEFF] flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#EFF4FF] rounded-xl">
            <button
              onClick={() => setSubTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === 'overview'
                  ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                  : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
              }`}
              style={{ minHeight: '36px' }}
            >
              <Layers3 className="h-4 w-4" />
              <span>Ringkasan Klinik</span>
            </button>
            <button
              onClick={() => setSubTab('category')}
              className={`px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === 'category'
                  ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                  : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
              }`}
              style={{ minHeight: '36px' }}
            >
              <Dna className="h-4 w-4" />
              <span>Per Kategori · {uniqueCategories.length}</span>
            </button>
            <button
              id="tab-progress-toggle"
              onClick={() => setSubTab('progress')}
              className={`px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === 'progress'
                  ? 'bg-white text-[#0B1C30] font-bold shadow-[0_2px_8px_rgba(11,28,48,0.08)]'
                  : 'text-[#516070] hover:text-[#0B1C30] hover:bg-white/60 font-semibold'
              }`}
              style={{ minHeight: '36px' }}
            >
              <Activity className="h-4 w-4" />
              <span>Progres Harian</span>
            </button>
          </div>

          <span className="text-xs text-[#74777C] hidden sm:inline">
            {sortedParams.length} parameter laboratorium terpantau
          </span>
        </div>
      </div>

      {feedback && (
        <div
          id="anal-error-alert"
          className="si-alert si-alert--danger bg-white rounded-2xl p-4 flex items-center gap-3 text-xs text-[#B91C1C]"
        >
          <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#B91C1C] flex items-center justify-center flex-none">
            <AlertCircle className="h-4 w-4" />
          </div>
          <span className="font-medium">{feedback}</span>
        </div>
      )}

      {loading ? (
        <AnalyticLoader message="Menganalisis data laboratorium & visualisasi..." />
      ) : (
        <>
          {/* ===================== VIEW 1: OVERVIEW ===================== */}
          {subTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* KPI 1: Total Pengujian */}
                <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                        Total Pengujian
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center flex-none">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums tracking-tight">
                      {totalExams.toLocaleString('id-ID')}
                    </h3>
                    <p className="text-xs text-[#516070] mt-1">
                      Sampel laboratorium rentang terpilih
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#E5EEFF] text-xs text-[#74777C] flex items-center justify-between">
                    <span>{uniqueCategories.length} kategori aktif</span>
                    <span className="font-mono font-semibold text-[#213145] tabular-nums">
                      {sortedParams.length} parameter
                    </span>
                  </div>
                </div>

                {/* KPI 2: Parameter Tertinggi */}
                <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                        Volume Tertinggi
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-[#FFE9E5] text-[#A13E32] flex items-center justify-center flex-none">
                        <Award className="h-5 w-5" />
                      </div>
                    </div>
                    {peakParameter ? (
                      <>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B1C30] font-display tracking-tight truncate">
                          {peakParameter.nama_parameter}
                        </h3>
                        <p className="text-xs font-semibold text-[#213145] mt-1 font-mono tabular-nums">
                          {peakParameter.jumlah.toLocaleString('id-ID')} uji tercatat
                        </p>
                      </>
                    ) : (
                      <h3 className="text-base font-bold text-[#74777C] font-display">
                        Belum ada data
                      </h3>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#E5EEFF] text-xs text-[#74777C] flex items-center justify-between">
                    <span className="truncate max-w-[160px]">
                      {peakParameter ? peakParameter.kategori : '—'}
                    </span>
                    <span className="font-mono font-semibold text-[#A13E32] tabular-nums">
                      {peakParameter && totalExams > 0
                        ? `${Math.round((peakParameter.jumlah / totalExams) * 100)}% porsi`
                        : '0%'}
                    </span>
                  </div>
                </div>

                {/* KPI 3: Volume Terendah */}
                <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                        Volume Terendah
                      </span>
                      <div className="w-10 h-10 rounded-xl bg-[#EFF4FF] text-[#516070] flex items-center justify-center flex-none">
                        <ArrowDown className="h-5 w-5" />
                      </div>
                    </div>
                    {lowParameter ? (
                      <>
                        <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B1C30] font-display tracking-tight truncate">
                          {lowParameter.nama_parameter}
                        </h3>
                        <p className="text-xs font-semibold text-[#516070] mt-1 font-mono tabular-nums">
                          {lowParameter.jumlah.toLocaleString('id-ID')} uji tercatat
                        </p>
                      </>
                    ) : (
                      <h3 className="text-base font-bold text-[#74777C] font-display">
                        Belum ada data
                      </h3>
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#E5EEFF] text-xs text-[#74777C] flex items-center justify-between">
                    <span className="truncate max-w-[160px]">
                      {lowParameter ? lowParameter.kategori : '—'}
                    </span>
                    <span>Parameter aktif</span>
                  </div>
                </div>
              </div>

              {/* Comparison Bar + Share Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Bar Chart */}
                <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 lg:col-span-7 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E5EEFF]">
                    <div>
                      <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                        Perbandingan Volume per Kategori
                      </h3>
                      <p className="text-xs text-[#516070] mt-0.5">
                        Distribusi jumlah pengujian berdasarkan kategori laboratorium
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#74777C] tabular-nums">
                      {startPeriodLabel} – {endPeriodLabel}
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    {recharts && comparisonChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparisonChartData}
                          margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#E5EEFF"
                          />
                          <XAxis
                            dataKey="name"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            stroke="#516070"
                          />
                          <YAxis
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            stroke="#74777C"
                          />
                          <Tooltip
                            content={<SlateTooltip />}
                            cursor={{ fill: '#EFF4FF', opacity: 0.7 }}
                          />
                          <Bar
                            dataKey="Jumlah Pengujian"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={48}
                          >
                            {comparisonChartData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : comparisonChartData.length > 0 ? (
                      <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                        Memuat grafik...
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                        Belum ada pengujian lab terdata pada periode ini.
                      </div>
                    )}
                  </div>
                </div>

                {/* Donut Chart + Clean Share Breakdown */}
                <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between gap-4">
                  <div className="pb-4 border-b border-[#E5EEFF]">
                    <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                      Kontribusi Kategori
                    </h3>
                    <p className="text-xs text-[#516070] mt-0.5">
                      Porsi masing-masing kategori terhadap total sampel
                    </p>
                  </div>

                  <div className="h-44 w-full flex items-center justify-center">
                    {recharts && categoryChartData.length > 0 && totalExams > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={74}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {categoryChartData.map((_, index) => (
                              <Cell
                                key={`pie-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<SlateTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : categoryChartData.length > 0 && totalExams > 0 ? (
                      <div className="text-xs text-[#74777C]">Memuat grafik...</div>
                    ) : (
                      <div className="text-xs text-[#74777C]">Belum ada data</div>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-[#E5EEFF]">
                    {categoryChartData.map((cat, idx) => {
                      const pct =
                        totalExams > 0 ? Math.round((cat.value / totalExams) * 100) : 0;
                      const color = CHART_COLORS[idx % CHART_COLORS.length];
                      return (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-2.5 w-2.5 rounded-full flex-none"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-[#0B1C30] truncate">
                                {cat.name}
                              </span>
                            </div>
                            <span className="font-mono text-[#516070] tabular-nums flex-none">
                              {cat.value.toLocaleString('id-ID')} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#EFF4FF] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: color
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Historical Multi-Series Area Trend */}
              <div className="si-card bg-white rounded-[20px] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E5EEFF]">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                      Tren Bulanan Pengujian Laboratorium
                    </h3>
                    <p className="text-xs text-[#516070] mt-0.5">
                      Pergerakan volume pengujian per kategori utama dan total keseluruhan
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#74777C]">
                    {trendData.length} bulan terdata
                  </span>
                </div>

                <div className="h-72 w-full">
                  {recharts && trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trendData}
                        margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                      >
                        <defs>
                          {trendCategories.map((cat, idx) => {
                            const color = CHART_COLORS[idx % CHART_COLORS.length];
                            return (
                              <linearGradient
                                key={cat}
                                id={`gradCat-${idx}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                              </linearGradient>
                            );
                          })}
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#E5EEFF"
                        />
                        <XAxis
                          dataKey="name"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          stroke="#516070"
                        />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          stroke="#74777C"
                        />
                        <Tooltip content={<SlateTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                        />
                        {trendCategories.map((cat, idx) => {
                          const color = CHART_COLORS[idx % CHART_COLORS.length];
                          return (
                            <Area
                              key={cat}
                              type="monotone"
                              dataKey={cat}
                              name={cat}
                              stroke={color}
                              strokeWidth={2}
                              fillOpacity={1}
                              fill={`url(#gradCat-${idx})`}
                            />
                          );
                        })}
                        <Area
                          type="monotone"
                          dataKey="Total"
                          name="Total Pengujian"
                          stroke="#213145"
                          strokeWidth={2.25}
                          fill="transparent"
                          strokeDasharray="5 4"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : trendData.length > 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                      Memuat grafik...
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                      Tidak ada visualisasi historis pada rentang ini.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== VIEW 2: PER KATEGORI ===================== */}
          {subTab === 'category' && (
            <div className="space-y-6">
              {/* Category Selector */}
              <div className="si-card bg-white rounded-[20px] p-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#516070] uppercase tracking-wider mr-1">
                  Kategori:
                </span>
                {uniqueCategories.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#213145] text-white shadow-[0_6px_16px_rgba(33,49,69,0.22)]'
                          : 'bg-[#EFF4FF] text-[#516070] hover:bg-[#E5EEFF] hover:text-[#0B1C30]'
                      }`}
                      style={{ minHeight: '34px' }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {!activeCategory ? (
                <div className="si-card bg-white rounded-[20px] p-12 text-center text-xs text-[#74777C]">
                  Belum ada data kategori lab yang terdaftar pada sistem.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category KPI Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                            Volume Kategori
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#E5EEFF] text-[#213145] flex items-center justify-center flex-none">
                            <Layers className="h-5 w-5" />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                          {categoryTotal.toLocaleString('id-ID')}
                        </h3>
                        <p className="text-xs text-[#516070] mt-1">
                          Total pengujian {activeCategory}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-[#E5EEFF] text-xs text-[#74777C] flex items-center justify-between">
                        <span>Parameter terdaftar</span>
                        <span className="font-mono font-semibold text-[#213145] tabular-nums">
                          {categorySpecificParams.length} jenis
                        </span>
                      </div>
                    </div>

                    <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                            Kontribusi Lab
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#EFF4FF] text-[#213145] flex items-center justify-center flex-none">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                          {categoryContributionPercent}%
                        </h3>
                        <p className="text-xs text-[#516070] mt-1">
                          Porsi dari {totalExams.toLocaleString('id-ID')} total sampel
                        </p>
                      </div>
                      <div className="pt-3 border-t border-[#E5EEFF]">
                        <div className="w-full h-1.5 bg-[#EFF4FF] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#213145] rounded-full transition-all duration-500"
                            style={{ width: `${categoryContributionPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="si-card bg-white rounded-[20px] p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="overline text-xs font-bold tracking-wider text-[#516070] uppercase">
                            Pemeriksaan Teraktif
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#FFE9E5] text-[#A13E32] flex items-center justify-center flex-none">
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                        </div>
                        {categoryPeakParam ? (
                          <>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-[#0B1C30] font-display truncate">
                              {categoryPeakParam.nama_parameter}
                            </h3>
                            <p className="text-xs font-semibold text-[#213145] mt-1 font-mono tabular-nums">
                              {categoryPeakParam.jumlah.toLocaleString('id-ID')} uji tercatat
                            </p>
                          </>
                        ) : (
                          <h3 className="text-base font-bold text-[#74777C] font-display">
                            Tidak ada volume
                          </h3>
                        )}
                      </div>
                      <div className="pt-3 border-t border-[#E5EEFF] text-xs text-[#74777C] flex items-center justify-between">
                        <span>{activeCategory}</span>
                        <span className="font-mono font-semibold text-[#A13E32] tabular-nums">
                          {categoryPeakParam && categoryTotal > 0
                            ? `${Math.round((categoryPeakParam.jumlah / categoryTotal) * 100)}% kategori`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top 10 Bar Chart + Details Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 lg:col-span-7">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E5EEFF]">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                            10 Besar Pemeriksaan ({activeCategory})
                          </h3>
                          <p className="text-xs text-[#516070] mt-0.5">
                            Top {topTenCategoryParams.length} dari{' '}
                            {categorySpecificParams.length} parameter
                          </p>
                        </div>
                      </div>

                      <div className="h-[340px] w-full">
                        {recharts && topTenCategoryParams.length > 0 && categoryTotal > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topTenCategoryParams}
                              layout="vertical"
                              margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                horizontal={true}
                                vertical={false}
                                stroke="#E5EEFF"
                              />
                              <XAxis
                                type="number"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                stroke="#74777C"
                              />
                              <YAxis
                                type="category"
                                dataKey="nama_parameter"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                stroke="#0B1C30"
                                width={160}
                                interval={0}
                              />
                              <Tooltip
                                content={<SlateTooltip />}
                                cursor={{ fill: '#EFF4FF', opacity: 0.7 }}
                              />
                              <Bar
                                dataKey="jumlah"
                                radius={[0, 6, 6, 0]}
                                barSize={18}
                                name="Jumlah Uji"
                              >
                                {topTenCategoryParams.map((_, idx) => (
                                  <Cell
                                    key={`top-${idx}`}
                                    fill={idx === 0 ? '#FF8574' : '#213145'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : topTenCategoryParams.length > 0 && categoryTotal > 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                            Memuat grafik...
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-[#74777C]">
                            Belum ada parameter berangka diinput pada kategori ini.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Structured Table (Single elevation, zero nested card box) */}
                    <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 lg:col-span-5 flex flex-col justify-between gap-4">
                      <div className="pb-3 border-b border-[#E5EEFF]">
                        <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                          Rincian Parameter ({activeCategory})
                        </h3>
                        <p className="text-xs text-[#516070] mt-0.5">
                          Daftar lengkap seluruh pemeriksaan pada kategori aktif
                        </p>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto -mx-2 px-2">
                        <table className="si-table w-full text-left text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th className="rounded-l-lg">Jenis Pemeriksaan</th>
                              <th className="text-right rounded-r-lg w-28">Jumlah Uji</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categorySpecificParams.length > 0 ? (
                              categorySpecificParams.map((param) => (
                                <tr key={param.parameter_id}>
                                  <td className="font-medium text-[#0B1C30]">
                                    {param.nama_parameter}
                                  </td>
                                  <td className="text-right font-mono font-semibold text-[#213145] tabular-nums">
                                    {param.jumlah.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="py-8 text-center text-[#74777C]"
                                >
                                  Tidak ada item pemeriksaan
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#EFF4FF] px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold text-[#0B1C30]">
                        <span>Grand Total ({activeCategory})</span>
                        <span className="font-mono font-bold text-[#213145] tabular-nums">
                          {categoryTotal.toLocaleString('id-ID')} uji
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== VIEW 3: PROGRES HARIAN PARAMETER ===================== */}
          {subTab === 'progress' && (
            <div
              id="view-parameter-progress"
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {/* LEFT PANEL: PARAMETER SELECTOR */}
              <div className="si-card bg-white rounded-[20px] p-5 lg:col-span-4 space-y-4 lg:sticky lg:top-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EEFF]">
                  <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                    Pilih Parameter
                  </h3>
                  <span className="text-xs font-mono text-[#74777C] tabular-nums">
                    {progressList.length} jenis
                  </span>
                </div>

                {/* Local Search Input */}
                <div className="relative">
                  <Search className="h-4 w-4 text-[#74777C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="progress-search-input"
                    type="text"
                    placeholder="Cari nama parameter atau kategori..."
                    value={progressSearch}
                    onChange={(e) => setProgressSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FF] border border-[#D3E4FE] rounded-xl text-xs text-[#0B1C30] placeholder:text-[#74777C] focus:outline-none focus:border-[#213145]"
                    style={{ minHeight: '38px' }}
                  />
                </div>

                {/* Parameter List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredProgressItems.length === 0 ? (
                    <div className="text-center py-8 text-[#74777C] text-xs">
                      Parameter tidak ditemukan.
                    </div>
                  ) : (
                    filteredProgressItems.map((p) => {
                      const isSelected = p.id === activeProgressParamId;
                      const totalDays = getDaysInRangeCount();
                      const coveragePct = Math.round((p.activeDays / totalDays) * 100);

                      return (
                        <button
                          key={p.id}
                          id={`progress-param-btn-${p.id}`}
                          onClick={() => setSelectedProgressParam(p.id)}
                          className={`w-full text-left p-3 rounded-xl transition-all text-xs cursor-pointer block ${
                            isSelected
                              ? 'bg-[#213145] text-white shadow-[0_8px_20px_rgba(33,49,69,0.22)]'
                              : 'bg-[#F8F9FF] hover:bg-[#EFF4FF] text-[#0B1C30]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate">
                              {p.nama_parameter}
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums flex-none ${
                                isSelected ? 'text-[#CCDCEF]' : 'text-[#213145]'
                              }`}
                            >
                              {p.total.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div
                            className={`flex items-center justify-between text-xs mt-1 ${
                              isSelected ? 'text-[#B8C8DB]' : 'text-[#74777C]'
                            }`}
                          >
                            <span className="truncate max-w-[140px]">
                              {p.kategori}
                            </span>
                            <span className="font-mono tabular-nums">
                              {p.activeDays} hr ({coveragePct}%)
                            </span>
                          </div>

                          <div
                            className={`w-full rounded-full h-1 mt-2 overflow-hidden ${
                              isSelected ? 'bg-white/15' : 'bg-[#E5EEFF]'
                            }`}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(0, coveragePct))}%`,
                                backgroundColor: isSelected ? '#FF8574' : '#213145'
                              }}
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT PANEL: FLAT SINGLE-ELEVATION ANALYTICS */}
              <div className="lg:col-span-8 space-y-5">
                {!activeProgressParam ? (
                  <div className="si-card bg-white rounded-[20px] p-12 text-center text-xs text-[#74777C]">
                    Silakan pilih jenis pemeriksaan di panel sebelah kiri untuk melihat analisis harian.
                  </div>
                ) : (
                  (() => {
                    const totalDays = getDaysInRangeCount();
                    const coveragePct = Math.round(
                      (activeProgressParam.activeDays / totalDays) * 100
                    );
                    const dailyAvg = (activeProgressParam.total / totalDays).toFixed(1);

                    return (
                      <>
                        {/* Active Parameter Title Bar */}
                        <div className="si-card bg-white rounded-[20px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#516070]">
                              {activeProgressParam.kategori} · {startPeriodLabel} –{' '}
                              {endPeriodLabel}
                            </p>
                            <h2 className="text-lg sm:text-xl font-extrabold text-[#0B1C30] font-display mt-0.5">
                              {activeProgressParam.nama_parameter}
                            </h2>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="text-xs text-[#74777C] block">
                              Akumulasi Rentang
                            </span>
                            <span className="text-base font-extrabold font-mono text-[#213145] tabular-nums">
                              {activeProgressParam.total.toLocaleString('id-ID')} uji
                            </span>
                          </div>
                        </div>

                        {/* 4 Clean Single-Level Metric Cards */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                          <div className="si-card bg-white rounded-[20px] p-4 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <span className="overline text-xs font-bold text-[#516070] uppercase">
                                Volume Uji
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-[#E5EEFF] text-[#213145] flex items-center justify-center">
                                <FlaskConical className="h-4 w-4" />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                                {activeProgressParam.total.toLocaleString('id-ID')}
                              </p>
                              <p className="text-xs text-[#74777C] mt-0.5">
                                Total sampel
                              </p>
                            </div>
                          </div>

                          <div className="si-card bg-white rounded-[20px] p-4 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <span className="overline text-xs font-bold text-[#516070] uppercase">
                                Rerata Harian
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-[#EFF4FF] text-[#213145] flex items-center justify-center">
                                <Activity className="h-4 w-4" />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                                {dailyAvg}
                              </p>
                              <p className="text-xs text-[#74777C] mt-0.5">
                                Uji per hari
                              </p>
                            </div>
                          </div>

                          <div className="si-card bg-white rounded-[20px] p-4 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <span className="overline text-xs font-bold text-[#516070] uppercase">
                                Puncak Harian
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-[#FFE9E5] text-[#A13E32] flex items-center justify-center">
                                <TrendingUp className="h-4 w-4" />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                                {activeProgressParam.maxCount.toLocaleString('id-ID')}
                              </p>
                              <p className="text-xs text-[#74777C] mt-0.5 truncate">
                                Tgl {activeProgressParam.maxDate}
                              </p>
                            </div>
                          </div>

                          <div className="si-card bg-white rounded-[20px] p-4 flex flex-col justify-between gap-3">
                            <div className="flex items-center justify-between">
                              <span className="overline text-xs font-bold text-[#516070] uppercase">
                                Konsistensi
                              </span>
                              <div className="w-8 h-8 rounded-lg bg-[#E5EEFF] text-[#213145] flex items-center justify-center">
                                <Calendar className="h-4 w-4" />
                              </div>
                            </div>
                            <div>
                              <p className="text-2xl font-extrabold text-[#0B1C30] font-display tabular-nums">
                                {coveragePct}%
                              </p>
                              <p className="text-xs text-[#74777C] mt-0.5 truncate tabular-nums">
                                {activeProgressParam.activeDays}/{totalDays} hari terisi
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Daily Area Timeline Chart */}
                        <div className="si-card bg-white rounded-[20px] p-5 sm:p-6">
                          <div className="pb-4 mb-4 border-b border-[#E5EEFF] flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                                Dinamika Kuantitas Harian
                              </h3>
                              <p className="text-xs text-[#516070] mt-0.5">
                                Tren harian tanggal-ke-tanggal pada rentang terpilih
                              </p>
                            </div>
                          </div>

                          <div className="h-64 w-full">
                            {recharts && activeProgressParam.dailySeries.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={activeProgressParam.dailySeries.map((day) => {
                                    let label = day.tanggal;
                                    try {
                                      const dt = new Date(day.tanggal);
                                      label = dt.toLocaleDateString('id-ID', {
                                        day: '2-digit',
                                        month: '2-digit'
                                      });
                                    } catch {
                                      // fallback to raw string
                                    }
                                    return {
                                      ...day,
                                      formattedDate: label
                                    };
                                  })}
                                  margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                                >
                                  <defs>
                                    <linearGradient
                                      id="colorJumlahSlate"
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="5%"
                                        stopColor="#213145"
                                        stopOpacity={0.22}
                                      />
                                      <stop
                                        offset="95%"
                                        stopColor="#CCDCEF"
                                        stopOpacity={0.02}
                                      />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#E5EEFF"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="formattedDate"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={6}
                                    stroke="#516070"
                                  />
                                  <YAxis
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-4}
                                    stroke="#74777C"
                                  />
                                  <Tooltip content={<SlateTooltip />} />
                                  <Area
                                    type="monotone"
                                    dataKey="jumlah"
                                    stroke="#213145"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorJumlahSlate)"
                                    name="Jumlah Uji"
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            ) : activeProgressParam.dailySeries.length > 0 ? (
                              <div className="h-full flex items-center justify-center text-[#74777C] text-xs">
                                Memuat grafik...
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[#74777C] text-xs">
                                Belum ada rekam transaksi harian pada rentang bulan terpilih.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chronological Daily Log Grid */}
                        <div className="si-card bg-white rounded-[20px] p-5 sm:p-6 space-y-4">
                          <div className="pb-3 border-b border-[#E5EEFF] flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-[#0B1C30] font-display">
                                Log Input Harian Kronologis
                              </h3>
                              <p className="text-xs text-[#516070] mt-0.5">
                                Rekap aktivitas harian untuk {activeProgressParam.nama_parameter}
                              </p>
                            </div>
                            <span className="text-xs font-mono text-[#74777C] tabular-nums">
                              {activeProgressParam.dailySeries.length} entri
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                            {activeProgressParam.dailySeries.length === 0 ? (
                              <div className="text-[#74777C] col-span-full text-center py-6 text-xs">
                                Tidak ada log data ditemukan untuk parameter ini.
                              </div>
                            ) : (
                              activeProgressParam.dailySeries.map((day, idx) => {
                                let dayName = '';
                                let formattedDateStr = day.tanggal;
                                try {
                                  const dt = new Date(day.tanggal);
                                  dayName = dt.toLocaleDateString('id-ID', {
                                    weekday: 'short'
                                  });
                                  formattedDateStr = dt.toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  });
                                } catch {
                                  // fallback
                                }

                                const hasActivity = day.jumlah > 0;
                                return (
                                  <div
                                    key={idx}
                                    className={`p-2.5 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                                      hasActivity
                                        ? 'bg-[#EFF4FF] border border-[#D3E4FE]'
                                        : 'bg-[#F8F9FF] border border-[#E5EEFF] text-[#74777C]'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold text-[#516070] block uppercase">
                                        {dayName}
                                      </span>
                                      <span className="text-xs font-medium text-[#0B1C30] block truncate">
                                        {formattedDateStr}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded-lg flex-none ${
                                        hasActivity
                                          ? 'bg-[#213145] text-white'
                                          : 'bg-[#E5EEFF] text-[#74777C]'
                                      }`}
                                    >
                                      {day.jumlah}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});
