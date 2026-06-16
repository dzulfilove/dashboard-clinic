import { useState, useEffect } from 'react';
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
  ArrowDown
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
  Line
} from 'recharts';
import api from '../../services/api.js';
import { LabData } from '../../types.js';

export default function DashboardLab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [labData, setLabData] = useState<LabData[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Month-Year defaults
  const d = new Date();
  const [selectedMonth, setSelectedMonth] = useState(d.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(2026); // Default seed year

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
      try {
        setLoading(true);
        const [dataRes, trendRes] = await Promise.all([
          api.get(`/lab/data?bulan=${selectedMonth}&tahun=${selectedYear}`),
          api.get('/lab/tren')
        ]);

        setLabData(dataRes.data);
        processTrendData(trendRes.data);
      } catch (err: any) {
        console.error('Failed to pull lab dashboard stats', err);
        setFeedback('Gagal menghubungi API server untuk analisis laboratorium.');
      } finally {
        setLoading(false);
      }
    }

    fetchLabAnalytics();
  }, [selectedMonth, selectedYear]);

  // Formats raw database flat records to recharts multi-series timeline data
  const processTrendData = (rawTrends: any[]) => {
    // rawTrends: [{ bulan, tahun, total, kategori }]
    // We group by "tahun-bulan" and map keys of categories
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
      timelineMap[periodKey][categoryName] = Number(row.total);
      timelineMap[periodKey].Total += Number(row.total);
    });

    const sortedList = Object.values(timelineMap)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12); // take last 12 periods

    setTrendData(sortedList);
  };

  // KPIs
  const totalExams = labData.reduce((sum, d) => sum + d.jumlah, 0);

  // Sorting descending to identify peak parameters
  const sortedParams = [...labData].sort((a, b) => b.jumlah - a.jumlah);
  const peakParameter = sortedParams[0];
  const lowParameter = sortedParams.filter(d => d.jumlah > 0).pop(); // non-zero minimum, or last index

  // Group current month data by category for category share distribution charts
  const categoryShareDataMap: { [cat: string]: number } = {};
  labData.forEach(d => {
    const key = d.kategori || 'LAIN-LAIN';
    categoryShareDataMap[key] = (categoryShareDataMap[key] || 0) + d.jumlah;
  });

  const COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const categoryChartData = Object.entries(categoryShareDataMap).map(([name, value]) => ({
    name,
    value
  }));

  const handleExportXlsx = () => {
    // Directly request ExcelJS generator stream from express server
    window.open(`/api/lab/export?bulan=${selectedMonth}&tahun=${selectedYear}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Upper header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-teal-600" />
            <span>Dashboard Tren & Analisis Laboratorium</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Visualisasi aktivitas klinis, fluktuasi kategori pemeriksaan, dan optimalisasi kapasitas Klinik Puri Medika.
          </p>
        </div>

        {/* Date period selector card */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-xs">
            <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <select 
              id="select-month-anal"
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
              id="select-year-anal"
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

          {/* Excel Export Button ONLY for Admin */}
          {user?.role === 'admin' && (
            <button
              id="export-lab-btn"
              onClick={handleExportXlsx}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-750 text-white text-sm font-bold py-3 px-5 rounded-xl shadow-sm transition-colors cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <Download className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Unduh Rekap (.xlsx)</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div id="anal-error-alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm font-medium">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Lab Analytical KPIs card blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI: Total examinations */}
        <div className="bg-white p-5 border border-slate-150 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-teal-50 rounded-xl text-teal-700">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xxs font-extrabold text-slate-400 uppercase tracking-wider block">Total Pengujian Bulan Ini</span>
            <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
              {loading ? '...' : totalExams}
            </span>
          </div>
        </div>

        {/* KPI: Highest test volumes peak parameter */}
        <div className="bg-white p-5 border border-slate-150 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-700">
            <Award className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xxs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Aktivitas Tertinggi (Peak)</span>
              <ArrowUp className="h-3 w-3 text-emerald-500 inline" />
            </span>
            {loading ? (
              <span className="text-sm font-bold text-slate-400 block mt-1">...</span>
            ) : peakParameter ? (
              <div className="truncate mt-1">
                <span className="text-sm font-extrabold text-slate-800 block truncate">{peakParameter.nama_parameter}</span>
                <span className="text-xs font-mono text-emerald-600 font-bold block mt-0.5">{peakParameter.jumlah} pengujian</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-400 block mt-1">Belum ada data</span>
            )}
          </div>
        </div>

        {/* KPI: Low parameter */}
        <div className="bg-white p-5 border border-slate-150 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 rounded-xl text-amber-700">
            <Award className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xxs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Saturasi Terendah (Low)</span>
              <ArrowDown className="h-3 w-3 text-rose-500 inline" />
            </span>
            {loading ? (
              <span className="text-sm font-bold text-slate-400 block mt-1">...</span>
            ) : lowParameter ? (
              <div className="truncate mt-1">
                <span className="text-sm font-extrabold text-slate-800 block truncate">{lowParameter.nama_parameter}</span>
                <span className="text-xs font-mono text-rose-500 font-bold block mt-0.5">{lowParameter.jumlah} pengujian</span>
              </div>
            ) : (
              <span className="text-sm font-bold text-slate-400 block mt-1">Belum ada data</span>
            )}
          </div>
        </div>

      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-24 text-center">
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
          <span className="text-sm text-slate-500">Mengkalkulasi grafik statistik...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart: 12-Month Stacked Bar clinical analytics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-teal-600" />
                <span>Tren Kategori Pemeriksaan Lab (12 Bulan Terakhir)</span>
              </h3>
            </div>

            <div className="h-80 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trendData}
                    margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#64748B" />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#64748B" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1E293B', color: '#F1F5F9', borderRadius: '12px' }} 
                      labelClassName="font-bold text-teal-400"
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="HEMATOLOGI" stackId="a" fill="#0EA5E9" name="Hematologi" />
                    <Bar dataKey="KIMIA DARAH" stackId="a" fill="#10B981" name="Kimia Darah" />
                    <Bar dataKey="IMUNOSEROLOGI" stackId="a" fill="#F59E0B" name="Imunoserologi" />
                    <Bar dataKey="URINALISIS" stackId="a" fill="#8B5CF6" name="Urinalisis" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Tidak ada data untuk grafik.</div>
              )}
            </div>
          </div>

          {/* Secondary Chart: Current month share distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3 text-base">
                Distribusi Uji {months.find(m => m.value === selectedMonth)?.name} {selectedYear}
              </h3>
              
              <div className="h-60 w-full flex items-center justify-center mt-3">
                {categoryChartData.length > 0 && totalExams > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-sm text-center py-10 leading-relaxed">
                    Belum ada pemeriksaan lab diinput pada periode terpilih ini.
                  </div>
                )}
              </div>
            </div>

            {categoryChartData.length > 0 && totalExams > 0 && (
              <div className="space-y-2 text-xs border-t border-slate-50 pt-3">
                {categoryChartData.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="font-semibold text-slate-600 truncate max-w-[150px]">{cat.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">
                      {cat.value} ({Math.round((cat.value / totalExams) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
