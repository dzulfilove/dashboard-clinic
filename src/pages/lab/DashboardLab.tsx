import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  TrendingUp, 
  Download, 
  FlaskConical, 
  Award, 
  AlertCircle, 
  RefreshCw, 
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Activity,
  Layers3,
  Dna,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import api from '../../services/api.js';
import { LabData } from '../../types.js';

// Framer Motion animation sets identical to Dashboard
const containerVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' }
  }
};

export default function DashboardLab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [labData, setLabData] = useState<LabData[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sub-navigation tabs: 'overview' for overall comparisons, 'category' for individual category dashboard, 'progress' for exam types progress
  const [subTab, setSubTab] = useState<'overview' | 'category' | 'progress'>('overview');

  // Daily parameter timeline for granular progression
  const [dailyProgressData, setDailyProgressData] = useState<any[]>([]);
  const [selectedProgressParam, setSelectedProgressParam] = useState<number | null>(null);
  const [progressSearch, setProgressSearch] = useState('');

  // Selected Category for Detailed Dashboard
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Month-Year period range selector state
  const d = new Date();
  const [startMonth, setStartMonth] = useState(1); // Default from January
  const [startYear, setStartYear] = useState(2026); // Default seed year
  const [endMonth, setEndMonth] = useState(d.getMonth() + 1); // Default to current month
  const [endYear, setEndYear] = useState(2026); // Default seed year

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

  // Fetch Laboratory volumes and history trend curves
  useEffect(() => {
    async function fetchLabAnalytics() {
      // Validate range to prevent requests with invalid range
      const isRangeValid = startYear < endYear || (startYear === endYear && startMonth <= endMonth);
      if (!isRangeValid) {
        setFeedback('Rentang tanggal tidak valid. Bulan Selesai harus sesudah atau sama dengan Bulan Mulai.');
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
          api.get(`/lab/data?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`),
          api.get('/lab/tren'),
          api.get(`/lab/parameter-harian?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`)
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
  }, [startMonth, startYear, endMonth, endYear]);

  // Handle setting default selected category once labData is loaded
  useEffect(() => {
    if (labData.length > 0 && !activeCategory) {
      const uniqueCats = Array.from(new Set(labData.map(d => d.kategori).filter(Boolean)));
      if (uniqueCats.length > 0) {
        setActiveCategory(uniqueCats[0]);
      }
    }
  }, [labData, activeCategory]);

  const getDaysInRangeCount = () => {
    const sD = new Date(startYear, startMonth - 1, 1);
    const eD = new Date(endYear, endMonth, 0); // Last day of endMonth
    const diffTime = Math.abs(eD.getTime() - sD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 30;
  };

  // Process daily progression for each lab parameter
  const getProgressList = () => {
    // Group dailyProgressData by parameterId
    const grouped: { [id: number]: {
      id: number;
      nama_parameter: string;
      kategori: string;
      total: number;
      activeDays: number;
      maxCount: number;
      maxDate: string;
      dailySeries: { tanggal: string; jumlah: number }[];
    } } = {};

    // Initialize all parameters we know about from labData to guarantee everything is listed
    labData.forEach(p => {
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

    // Populate daily entries
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
          
          // Format date to local standard ID (e.g. DD/MM)
          try {
            const dateObj = new Date(row.tanggal);
            const formattedDate = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
            grouped[pId].maxDate = formattedDate;
          } catch (e) {
            grouped[pId].maxDate = row.tanggal;
          }
        }
      }
    });

    // Sort series by date for each parameter
    Object.values(grouped).forEach(g => {
      g.dailySeries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
    });

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  // Formats raw database flat records to recharts multi-series timeline data and filters by current range
  const processTrendData = (rawTrends: any[], sM = 1, sY = 2026, eM = 12, eY = 2026) => {
    const timelineMap: { [key: string]: any } = {};
    
    rawTrends.forEach((row: any) => {
      const label = `${months.find(m => m.value === row.bulan)?.name.substring(0, 3)} ${row.tahun}`;
      const periodKey = `${row.tahun}-${String(row.bulan).padStart(2, '0')}`;
      
      if (!timelineMap[periodKey]) {
        timelineMap[periodKey] = {
          name: label,
          sortKey: periodKey,
          HEMATOLOGI: 0,
          'KIMIA DARAH': 0,
          IMUNOSEROLOGI: 0,
          URINALISIS: 0,
          Total: 0
        };
      }
      
      const categoryName = row.kategori.toUpperCase();
      timelineMap[periodKey][categoryName] = (timelineMap[periodKey][categoryName] || 0) + Number(row.total);
      timelineMap[periodKey].Total += Number(row.total);
    });

    const startKey = `${sY}-${String(sM).padStart(2, '0')}`;
    const endKey = `${eY}-${String(eM).padStart(2, '0')}`;

    const sortedList = Object.values(timelineMap)
      .sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey))
      .filter((item: any) => item.sortKey >= startKey && item.sortKey <= endKey);

    setTrendData(sortedList);
  };

  // Overall KPIs
  const totalExams = labData.reduce((sum, d) => sum + d.jumlah, 0);

  // Sorting descending to identify peak parameters
  const sortedParams = [...labData].sort((a, b) => b.jumlah - a.jumlah);
  const peakParameter = sortedParams[0];
  const lowParameter = sortedParams.filter(d => d.jumlah > 0).pop();

  // Group current month data by category for category comparison list & charts
  const categoryShareDataMap: { [cat: string]: number } = {};
  labData.forEach(d => {
    const key = d.kategori || 'LAIN-LAIN';
    categoryShareDataMap[key] = (categoryShareDataMap[key] || 0) + d.jumlah;
  });

  const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#EF4444'];
  const categoryChartData = Object.entries(categoryShareDataMap).map(([name, value]) => ({
    name,
    value
  }));

  // Unique categories helper
  const uniqueCategories = Array.from(new Set(labData.map(d => d.kategori).filter(Boolean)));

  // Category-specific details (FOR CATEGORY DASHBOARD)
  const categorySpecificParams = labData.filter(d => d.kategori === activeCategory);
  const categoryTotal = categorySpecificParams.reduce((sum, d) => sum + d.jumlah, 0);
  const categoryPeakParam = [...categorySpecificParams].sort((a, b) => b.jumlah - a.jumlah)[0];
  const categoryContributionPercent = totalExams > 0 ? Math.round((categoryTotal / totalExams) * 100) : 0;

  // Render comparative category bar chart data
  const comparisonChartData = categoryChartData.map((cat, idx) => ({
    name: cat.name,
    'Jumlah Pengujian': cat.value,
    color: COLORS[idx % COLORS.length]
  }));

  const handleExportXlsx = () => {
    window.open(`/api/lab/export?start_bulan=${startMonth}&start_tahun=${startYear}&end_bulan=${endMonth}&end_tahun=${endYear}`, '_blank');
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      
        {/* 1. Header controls (High Density, Poppins) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100/60 pb-3"
        >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            <span>Dashboard Tren &amp; Analisis Laboratorium</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Visualisasi aktivitas klinis, fluktuasi kategori pemeriksaan, dan kapasitas Klinik Puri Medika.
          </p>
        </div>

        {/* Date range period selector card */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-white px-3 py-1 border border-slate-100 rounded-2xl shadow-sm">
            <Calendar className="h-4 w-4 text-teal-605 flex-shrink-0" />
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-normal text-[9px] uppercase">Dari:</span>
              <select 
                id="select-start-month-anal"
                value={startMonth} 
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="text-xxs font-normal bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <select 
                id="select-start-year-anal"
                value={startYear} 
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="text-xxs font-normal bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            
            <span className="text-slate-300">|</span>
            
            <div className="flex items-center space-x-1">
              <span className="text-slate-400 font-normal text-[9px] uppercase">Selesai:</span>
              <select 
                id="select-end-month-anal"
                value={endMonth} 
                onChange={(e) => setEndMonth(Number(e.target.value))}
                className="text-xxs font-normal bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <select 
                id="select-end-year-anal"
                value={endYear} 
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="text-xxs font-normal bg-transparent border-none text-slate-800 focus:outline-none cursor-pointer"
                style={{ minHeight: '36px' }}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Excel Export Button ONLY for Admin */}
          {user?.role === 'admin' && (
            <button
              id="export-lab-btn"
              onClick={handleExportXlsx}
              className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white text-xxs font-medium py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ minHeight: '36px' }}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh Rekap</span>
            </button>
          )}
        </div>
        </motion.div>

      {feedback && (
        <div id="anal-error-alert" className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-center space-x-2 font-normal shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Interactive Navigation Sub-Tabs bar */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="flex flex-wrap border-b border-slate-200/60 pb-2 gap-1 mb-1"
      >
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2 rounded-xl text-xxs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
            subTab === 'overview'
              ? 'bg-teal-50 border-teal-100/60 text-teal-750 font-semibold'
              : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'
          }`}
          style={{ minHeight: '36px' }}
        >
          <Layers3 className="h-4 w-4" />
          <span>Ringkasan &amp; Perbandingan Kategori (Klinik-Wide)</span>
        </button>
        <button
          onClick={() => setSubTab('category')}
          className={`px-4 py-2 rounded-xl text-xxs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
            subTab === 'category'
              ? 'bg-teal-50 border-teal-100/60 text-teal-750 font-semibold'
              : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'
          }`}
          style={{ minHeight: '36px' }}
        >
          <Dna className="h-4 w-4" />
          <span>Dashboard Masing-Masing Kategori ({uniqueCategories.length})</span>
        </button>
        <button
          id="tab-progress-toggle"
          onClick={() => setSubTab('progress')}
          className={`px-4 py-2 rounded-xl text-xxs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
            subTab === 'progress'
              ? 'bg-teal-50 border-teal-100/60 text-teal-750 font-semibold'
              : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50'
          }`}
          style={{ minHeight: '36px' }}
        >
          <Activity className="h-4 w-4" />
          <span>Progres &amp; Tren Harian Jenis Pemeriksaan</span>
        </button>
      </motion.div>

      {/* ===================== VIEW 1: GENERAL KLINIK OVERVIEW COMPARISONS ===================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Lab Overall KPIs Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* KPI: Total examinations */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                  <FlaskConical className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
                  Volume Total
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                  {loading ? '...' : totalExams}
                </h3>
                <p className="text-xxs font-normal text-slate-500 mt-1">Total Pengujian Rentang Terpilih</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
            </motion.div>

            {/* KPI: Highest category or parameter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                  <Award className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-[10px] font-mono font-medium bg-emerald-100/80 text-emerald-850 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <span>Puncak</span>
                  <ArrowUp className="h-2.5 w-2.5 text-emerald-600 inline" />
                </span>
              </div>
              <div className="mt-4">
                {loading ? (
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">...</h3>
                ) : peakParameter ? (
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display truncate leading-tight">
                      {peakParameter.nama_parameter}
                    </h3>
                    <p className="text-xxs font-mono text-emerald-600 font-bold mt-1">{peakParameter.jumlah} Uji</p>
                  </div>
                ) : (
                  <h3 className="text-sm font-semibold text-slate-400 tracking-tight font-display mt-1">Belum ada data</h3>
                )}
                <p className="text-xxs font-normal text-slate-500 mt-1">Parameter Volume Tertinggi</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-600"></div>
            </motion.div>

            {/* KPI: Lowest Parameter count */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32 }}
              whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-[10px] font-mono font-medium bg-amber-100/80 text-amber-850 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <span>Terendah</span>
                  <ArrowDown className="h-2.5 w-2.5 text-amber-600 inline" />
                </span>
              </div>
              <div className="mt-4">
                {loading ? (
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">...</h3>
                ) : lowParameter ? (
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display truncate leading-tight">
                      {lowParameter.nama_parameter}
                    </h3>
                    <p className="text-xxs font-mono text-amber-600 font-bold mt-1">{lowParameter.jumlah} Uji</p>
                  </div>
                ) : (
                  <h3 className="text-sm font-semibold text-slate-400 tracking-tight font-display mt-1">Belum ada data</h3>
                )}
                <p className="text-xxs font-normal text-slate-500 mt-1">Parameter Volume Terendah</p>
              </div>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
            </motion.div>

          </div>

          {/* Main Visualizations: Multi-Category Comparison and Trend */}
          {loading ? (
            <div className="bg-white p-12 border rounded-xl text-center">
              <RefreshCw className="h-6 w-6 text-teal-650 animate-spin mx-auto mb-2" />
              <span>Memproses grafik statistik perbandingan...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* STK-1: Chart Perbandingan antar Kategori (Requested Feature) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h3 className="font-medium text-slate-700 flex items-center gap-1.5 text-xxs tracking-wider uppercase">
                    <Layers className="h-4 w-4 text-teal-605" />
                    <span>Perbandingan Volume Aktivitas per Kategori Lab</span>
                  </h3>
                  <span className="text-[10px] font-normal text-slate-400 font-mono">
                    {months.find(m => m.value === startMonth)?.name} {startYear} - {months.find(m => m.value === endMonth)?.name} {endYear}
                  </span>
                </div>

                <div className="h-64 w-full">
                  {comparisonChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke="#64748B" />
                        <YAxis fontSize={9} tickLine={false} axisLine={false} stroke="#64748B" />
                        <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', padding: '6px' }} />
                        <Bar dataKey="Jumlah Pengujian" fill="#0EA5E9" radius={[4, 4, 0, 0]}>
                          {comparisonChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">Belum ada pengujian lab terdata.</div>
                  )}
                </div>
              </motion.div>

              {/* STK-2: Distribution Pie Chart */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.48 }}
                className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="border-b border-slate-100 pb-2 mb-3">
                    <h3 className="font-medium text-slate-700 text-xxs tracking-wider uppercase">
                      Persentase Kontribusi Kategori
                    </h3>
                  </div>

                  <div className="h-40 w-full flex items-center justify-center">
                    {categoryChartData.length > 0 && totalExams > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '9px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-400 text-center py-6">Kosong</div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-50 pt-2 text-[10px]">
                  {categoryChartData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="font-normal text-slate-600 truncate uppercase">{cat.name}</span>
                      </div>
                      <span className="font-medium text-slate-700 font-mono flex-shrink-0">
                        {cat.value} ({totalExams > 0 ? Math.round((cat.value / totalExams) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>
          )}

          {/* STK-3: Long-term stacked historical curves comparison */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.56 }}
            className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm"
          >
            <h3 className="font-medium text-slate-700 text-xxs tracking-wider uppercase mb-3 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-slate-500" />
              <span>Analisis Tren &amp; Perkembangan Pengujian Lab (12 Bulan)</span>
            </h3>
            
            <div className="h-60 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHematologi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorKimia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} stroke="#64748B" />
                    <YAxis fontSize={9} tickLine={false} axisLine={false} stroke="#64748B" />
                    <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="HEMATOLOGI" name="Hematologi" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorHematologi)" />
                    <Area type="monotone" dataKey="KIMIA DARAH" name="Kimia Darah" stroke="#10B981" fillOpacity={1} fill="url(#colorKimia)" />
                    <Area type="monotone" dataKey="Total" name="Total Pengujian" stroke="#64748B" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">Tidak ada visualisasi historis.</div>
              )}
            </div>
          </motion.div>

        </div>
      )}

      {/* ===================== VIEW 2: DASHBOARD MASING-MASING KATEGORI ===================== */}
      {subTab === 'category' && (
        <div className="space-y-6">
          
          {/* Interactive Category Selector bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="bg-slate-50/50 border border-slate-100/60 p-3 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-sm"
          >
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-teal-600" />
              <span>Pilih Kategori:</span>
            </span>
            {uniqueCategories.map((cat, idx) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xxs font-medium uppercase transition-all tracking-wide cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-850'
                }`}
                style={{ minHeight: '32px' }}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {!activeCategory ? (
            <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-xl">
              <span>Belum ada data kategori lab yang terdaftar pada sistem.</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Category-Specific KPIs layout */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                
                {/* Metric 1 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.16 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                      <Layers className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-850 px-2.5 py-0.5 rounded-full">
                      Kategori
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {categoryTotal} <span className="text-[10px] text-slate-400 font-normal">Uji</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Pengujian Kategori</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>

                {/* Metric 2 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.24 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-emerald-100/80 text-emerald-850 px-2.5 py-0.5 rounded-full">
                      Rasio
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-teal-650 tracking-tight font-display">
                      {categoryContributionPercent}%
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Rasio Penetrasi Lab</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-600"></div>
                </motion.div>

                {/* Metric 3 */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.32 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-100/80 shadow-sm relative overflow-hidden group transition-all sm:col-span-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-sky-50 text-sky-700 rounded-xl group-hover:scale-105 transition-transform">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-sky-100/80 text-sky-850 px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <span>Teraktif</span>
                    </span>
                  </div>
                  <div className="mt-4">
                    {categoryPeakParam ? (
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display truncate">
                          {categoryPeakParam.nama_parameter}
                        </h3>
                        <p className="text-xxs font-mono text-sky-655 font-bold mt-1">
                          {categoryPeakParam.jumlah} Uji Kali Ini
                        </p>
                      </div>
                    ) : (
                      <h3 className="text-sm font-semibold text-slate-400 tracking-tight font-display mt-1">Tidak ada volume</h3>
                    )}
                    <p className="text-xxs font-normal text-slate-500 mt-1">Pemeriksaan Teraktif ({activeCategory})</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-sky-500"></div>
                </motion.div>

              </div>

              {/* Category comparison charts */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                
                {/* 1. Bar chart comparing individual tests inside this category */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm lg:col-span-3"
                >
                  <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-xxs uppercase tracking-wider">
                      Distribusi Volume Antar Jenis Pemeriksaan ({activeCategory})
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                      {categorySpecificParams.length} Parameter
                    </span>
                  </div>

                  <div className="h-60 w-full">
                    {categorySpecificParams.length > 0 && categoryTotal > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={categorySpecificParams}
                           layout="vertical"
                           margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F1F5F9" />
                          <XAxis type="number" fontSize={9} tickLine={false} axisLine={false} stroke="#64748B" />
                          <YAxis 
                            type="category" 
                            dataKey="nama_parameter" 
                            fontSize={8} 
                            tickLine={false} 
                            axisLine={false} 
                            stroke="#1E293B" 
                            width={110}
                          />
                          <Tooltip contentStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="jumlah" fill="#14B8A6" radius={[0, 4, 4, 0]} name="Hasil Rentang Terpilih" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        Belum ada parameter berangka diinput pada kategori ini.
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* 2. Structured Table of all specific items in this category */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.48 }}
                  className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm lg:col-span-2 space-y-3"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-800 text-xxs uppercase tracking-wider block">
                      Tabel Rincian parameter ({activeCategory})
                    </span>
                  </div>

                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-sm">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 font-semibold text-slate-605 border-b border-slate-100/60">
                          <th className="px-3 py-2">Jenis Pemeriksaan</th>
                          <th className="px-3 py-2 text-right w-24">Jumlah Uji</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categorySpecificParams.length > 0 ? (
                          categorySpecificParams.map((param, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-normal text-slate-700">{param.nama_parameter}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">{param.jumlah}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={2} className="px-3 py-4 text-center text-slate-400">Tidak ada item</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-teal-50/40 p-2.5 rounded-lg border border-teal-100/60 text-[10px] text-teal-850 flex items-center justify-between font-medium">
                    <span>Grand Total Kategori ({activeCategory}):</span>
                    <span className="font-mono text-xs text-teal-700 font-semibold">{categoryTotal}</span>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW 3: GRANULAR TELEMETRY PROGRESS BY PARAMETER ===================== */}
      {subTab === 'progress' && (
        <div id="view-parameter-progress" className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm"
          >
            <h2 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-teal-600 animate-pulse" />
              <span>Progres Data Pemeriksaan per Jenis Pemeriksaan (Parameter Klinis)</span>
            </h2>
            <p className="text-slate-500 mt-1 text-xxs font-normal">
              Analisa harian kuantitas pengujian laboratorium, dinamika pemeriksaan dari waktu ke waktu, serta frekuensi keberadaan data di Klinik Puri Medika.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            
            {/* LEFT SIDE: SEARCH & PARAMETER SELECTOR CARD */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-sm space-y-3 lg:col-span-1"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Pilih Jenis Pemeriksaan</span>
                <span className="text-[10px] font-mono text-slate-400">Total: {getProgressList().length} Jenis</span>
              </div>

              {/* Local Search Input */}
              <div className="relative">
                <input
                  id="progress-search-input"
                  type="text"
                  placeholder="Cari nama pemeriksaan/parameter..."
                  value={progressSearch}
                  onChange={(e) => setProgressSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xxs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-300 font-normal shadow-sm"
                  style={{ minHeight: '32px' }}
                />
              </div>

              {/* Parameters List scrollbox */}
              <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                {(() => {
                  const items = getProgressList().filter(item => 
                    item.nama_parameter.toLowerCase().includes(progressSearch.toLowerCase()) ||
                    item.kategori.toLowerCase().includes(progressSearch.toLowerCase())
                  );

                  if (items.length === 0) {
                    return (
                      <div className="text-center py-8 text-slate-400 text-xxs font-normal">
                        Parameter tidak ditemukan.
                      </div>
                    );
                  }

                  const activeParamId = selectedProgressParam || items[0]?.id;

                  return items.map((p) => {
                    const isSelected = p.id === activeParamId;
                    const totalDays = getDaysInRangeCount();
                    const coveragePct = Math.round((p.activeDays / totalDays) * 100);

                    return (
                      <button
                        key={p.id}
                        id={`progress-param-btn-${p.id}`}
                        onClick={() => setSelectedProgressParam(p.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all text-xxs cursor-pointer block ${
                          isSelected
                            ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-sm scale-[1.01]'
                            : 'bg-white border-slate-100/80 text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold truncate max-w-[150px]">{p.nama_parameter}</span>
                          <span className="font-mono text-[9px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 block flex-shrink-0">
                            {p.total} uji
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span className="uppercase tracking-wider text-[9px] font-medium font-mono truncate">{p.kategori}</span>
                          <span className="font-mono text-[9px]">{p.activeDays} hari ({coveragePct}%)</span>
                        </div>
                        
                        {/* Custom micro-progress consistency bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isSelected ? 'bg-teal-600' : 'bg-slate-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
                          />
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>

            {/* RIGHT SIDE: DETAILED PROGRESS ANALYSIS FOR CURRENT PARAMETER */}
            <div className="lg:col-span-2 space-y-4">
              {(() => {
                const list = getProgressList();
                const itemsFiltered = list.filter(item => 
                  item.nama_parameter.toLowerCase().includes(progressSearch.toLowerCase()) ||
                  item.kategori.toLowerCase().includes(progressSearch.toLowerCase())
                );
                
                const activeParamId = selectedProgressParam || itemsFiltered[0]?.id || list[0]?.id;
                const activeParam = list.find(p => p.id === activeParamId);

                if (!activeParam) {
                  return (
                    <div className="bg-white p-12 text-center rounded-2xl border border-slate-100/80 text-slate-400 text-xxs shadow-sm">
                      Silakan pilih jenis pemeriksaan di panel sebelah kiri untuk memuat rekap analisis.
                    </div>
                  );
                }

                const totalDays = getDaysInRangeCount();
                const coveragePct = Math.round((activeParam.activeDays / totalDays) * 100);
                const dailyAvg = (activeParam.total / totalDays).toFixed(1);

                return (
                  <div className="space-y-6">
                    
                    {/* Active Param Header & Stats Grid */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-bold uppercase tracking-wider font-mono text-[9px] mb-1">
                            {activeParam.kategori}
                          </span>
                          <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                            {activeParam.nama_parameter}
                          </h3>
                        </div>
                        <div className="text-right sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Rentang Aktif</span>
                          <span className="text-[10px] font-semibold text-teal-700 font-mono">
                            {months[startMonth - 1]?.name} {startYear} - {months[endMonth - 1]?.name} {endYear}
                          </span>
                        </div>
                      </div>

                      {/* Display metric cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                        {/* Metric 1: Kuantitas Uji */}
                        <motion.div 
                          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                          transition={{ duration: 0.2 }}
                          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl group-hover:scale-105 transition-transform">
                              <FlaskConical className="h-5 w-5" />
                            </div>
                            <span className="text-[9px] font-mono font-medium bg-slate-100/80 text-slate-700 px-2 py-0.5 rounded-full">
                              Volume
                            </span>
                          </div>
                          <div className="mt-4">
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                              {activeParam.total} <span className="text-xs font-normal text-slate-450">Uji</span>
                            </h3>
                            <p className="text-xxs font-normal text-slate-500 mt-1">Volume Kuantitas Uji</p>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-400"></div>
                        </motion.div>

                        {/* Metric 2: Rata-rata/Hari */}
                        <motion.div 
                          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                          transition={{ duration: 0.2 }}
                          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                              <Activity className="h-5 w-5" />
                            </div>
                            <span className="text-[9px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2 py-0.5 rounded-full">
                              Harian
                            </span>
                          </div>
                          <div className="mt-4">
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                              {dailyAvg} <span className="text-xs font-normal text-slate-450">Uji/hr</span>
                            </h3>
                            <p className="text-xxs font-normal text-slate-500 mt-1">Rerata Frekuensi Uji</p>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                        </motion.div>

                        {/* Metric 3: Puncak Tertinggi */}
                        <motion.div 
                          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                          transition={{ duration: 0.2 }}
                          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl group-hover:scale-105 transition-transform">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <span className="text-[9px] font-mono font-medium bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full">
                              Puncak
                            </span>
                          </div>
                          <div className="mt-4">
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                              {activeParam.maxCount} <span className="text-xs font-normal text-slate-450">Uji</span>
                            </h3>
                            <p className="text-xxs font-normal text-slate-500 mt-1 truncate">Maksimum tgl {activeParam.maxDate}</p>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-600"></div>
                        </motion.div>

                        {/* Metric 4: Konsistensi Data */}
                        <motion.div 
                          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                          transition={{ duration: 0.2 }}
                          className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <span className="text-[9px] font-mono font-medium bg-amber-100/80 text-amber-800 px-2 py-0.5 rounded-full">
                              Rasio
                            </span>
                          </div>
                          <div className="mt-4">
                            <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                              {coveragePct}%
                            </h3>
                            <p className="text-xxs font-normal text-slate-500 mt-1 truncate">{activeParam.activeDays}/{totalDays} Hari Terisi</p>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Progression Timeline Chart */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">Dinamika Kuantitas Harian (Tanggal-ke-Tanggal)</span>
                      </div>

                      <div className="h-64 mt-2">
                        {activeParam.dailySeries.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activeParam.dailySeries.map(day => {
                              let label = day.tanggal;
                              try {
                                const dt = new Date(day.tanggal);
                                label = dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
                              } catch(e) {}
                              return {
                                ...day,
                                formattedDate: label
                              };
                            })} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorJumlah" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0.01}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                              <XAxis 
                                dataKey="formattedDate" 
                                fontSize={8} 
                                tickLine={false} 
                                dy={6}
                                stroke="#64748B" 
                              />
                              <YAxis 
                                fontSize={8} 
                                tickLine={false} 
                                axisLine={false} 
                                dx={-6}
                                stroke="#64748B" 
                              />
                              <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                              <Area 
                                type="monotone" 
                                dataKey="jumlah" 
                                stroke="#0D9488" 
                                strokeWidth={2.5} 
                                fillOpacity={1} 
                                fill="url(#colorJumlah)" 
                                name="Jumlah Uji" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xxs">
                            Belum ada rekam transaksi harian pada rentang bulan terpilih.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Calendar Daily Heatmap Log Grid */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="border-b border-slate-100 pb-2">
                        <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                          Log Input Harian Kronologis ({activeParam.nama_parameter})
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                        {(() => {
                          if (activeParam.dailySeries.length === 0) {
                            return <div className="text-slate-400 col-span-full text-center py-4 text-xxs">Tidak ada log data ditemukan untuk parameter ini.</div>;
                          }
                          return activeParam.dailySeries.map((day, idx) => {
                            let dayName = '';
                            let formattedDateStr = day.tanggal;
                            try {
                              const dt = new Date(day.tanggal);
                              dayName = dt.toLocaleDateString('id-ID', { weekday: 'short' });
                              formattedDateStr = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                            } catch(e){}

                            return (
                              <div key={idx} className={`p-2 rounded-lg border transition-all text-left flex items-center justify-between gap-1.5 ${
                                day.jumlah > 0 
                                  ? 'bg-teal-50/40 border-teal-100 shadow-2xs' 
                                  : 'bg-slate-50/50 border-slate-100 text-slate-400'
                              }`}>
                                <div>
                                  <span className="text-[8px] font-semibold text-slate-400 block tracking-wider uppercase">{dayName}</span>
                                  <span className="text-[10px] font-medium leading-none block mt-0.5 truncate">{formattedDateStr}</span>
                                </div>
                                <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                                  day.jumlah > 0 ? 'bg-teal-600 text-white' : 'bg-slate-200/50 text-slate-400'
                                }`}>
                                  {day.jumlah}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
