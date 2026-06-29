import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartPulse, 
  Search, 
  Calendar, 
  Activity, 
  TrendingUp, 
  Users, 
  Sparkles, 
  X, 
  ArrowRight,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Stethoscope,
  Info
} from 'lucide-react';
import api from '../../services/api.js';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  BarChart,
  Bar
} from 'recharts';

interface DiagnosisDetail {
  icd_kode: string;
  deskripsi: string;
  jumlah: number;
  rawat_jalan: number;
  igd: number;
  rawat_inap: number;
  gender: {
    L: number;
    P: number;
    'Tidak Diketahui': number;
  };
  age: {
    'Balita (<5 thn)': number;
    'Anak-anak (5-11 thn)': number;
    'Remaja (12-17 thn)': number;
    'Dewasa (18-45 thn)': number;
    'Paruh Baya (46-60 thn)': number;
    'Lansia (>60 thn)': number;
    'Tidak Diketahui': number;
  };
}

interface TimelineItem {
  tanggal: string;
  [key: string]: any;
}

export default function DemografiDiagnosa() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API Data States
  const [topDiagnosa, setTopDiagnosa] = useState<DiagnosisDetail[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [top5Codes, setTop5Codes] = useState<string[]>([]);
  
  // Selected Diagnosis for detailed breakdown panel
  const [selectedDiag, setSelectedDiag] = useState<DiagnosisDetail | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Color Palette
  const COLORS = ['#0f766e', '#0284c7', '#4f46e5', '#d97706', '#db2777', '#7c3aed', '#16a34a'];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pelayanan/demografi/diagnosa', {
        params: { startDate, endDate }
      });
      const data = res.data.topDiagnosa || [];
      setTopDiagnosa(data);
      setTimelineData(res.data.timelineData || []);
      setTop5Codes(res.data.top5Codes || []);

      // Set default selected diagnosis
      if (data.length > 0) {
        setSelectedDiag(data[0]);
      } else {
        setSelectedDiag(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal memuat demografi diagnosa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const filteredDiagnoses = topDiagnosa.filter(item => 
    item.icd_kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate percentages/summary for the selected diagnosis
  const getSelectedDiagSummary = () => {
    if (!selectedDiag) return null;
    const total = selectedDiag.jumlah;
    const lCount = selectedDiag.gender.L;
    const pCount = selectedDiag.gender.P;
    
    const maxAgeGroup = Object.entries(selectedDiag.age)
      .filter(([key]) => key !== 'Tidak Diketahui')
      .sort((a, b) => b[1] - a[1])[0];

    const genderDominance = lCount > pCount ? 'Laki-laki' : pCount > lCount ? 'Perempuan' : 'Seimbang';

    return {
      lPercent: total > 0 ? Math.round((lCount / total) * 100) : 0,
      pPercent: total > 0 ? Math.round((pCount / total) * 100) : 0,
      maxAgeGroupName: maxAgeGroup && maxAgeGroup[1] > 0 ? maxAgeGroup[0] : 'Tidak Spesifik',
      genderDominance
    };
  };

  const summary = getSelectedDiagSummary();

  // Map Selected Diagnosis Age Data for Recharts
  const getAgeChartData = () => {
    if (!selectedDiag) return [];
    return Object.entries(selectedDiag.age)
      .filter(([name]) => name !== 'Tidak Diketahui')
      .map(([name, value]) => ({ name, value }));
  };

  // Map Selected Diagnosis Gender Data for Recharts
  const getGenderChartData = () => {
    if (!selectedDiag) return [];
    return [
      { name: 'Laki-laki', value: selectedDiag.gender.L, color: '#0ea5e9' },
      { name: 'Perempuan', value: selectedDiag.gender.P, color: '#ec4899' }
    ].filter(item => item.value > 0);
  };

  // Map Top Diagnoses for Share Pie Chart
  const getTopPieData = () => {
    return topDiagnosa.slice(0, 5).map(item => ({
      name: `${item.icd_kode} - ${item.deskripsi.length > 20 ? item.deskripsi.substring(0, 20) + '...' : item.deskripsi}`,
      value: item.jumlah
    }));
  };

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100 gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-teal-600 animate-pulse" />
            <span>Demografi Berdasarkan Diagnosa (ICD-10)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Analisis statistik sebaran penyakit, profil demografi penderita, dan tren diagnosis medis di klinik.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-50">
          <div className="flex items-center space-x-1.5 text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Periode:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
          />
          <span className="text-slate-400 text-xs font-semibold">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
          />
        </div>
      </motion.div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-xs">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-teal-600"></div>
            <Activity className="absolute h-4 w-4 text-teal-600 animate-pulse" />
          </div>
          <p className="text-sm text-slate-500 mt-4 font-medium">Menganalisis statistik diagnosa...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3">
          <X className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : topDiagnosa.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-50 p-12 text-center space-y-3">
          <Stethoscope className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Tidak Ada Data Diagnosa</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ditemukan catatan registrasi pelayanan dengan diagnosa ICD-10 yang valid pada rentang tanggal yang dipilih.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SECTION: Overview Charts (Donut & Trend Line) - occupy 8 cols on desktop */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Bento Grid: Pie Distribution & Area Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Pie/Donut Share of Top 5 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 }}
                className="bg-white rounded-2xl p-5 flex flex-col h-[320px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <PieIcon className="h-4 w-4 text-teal-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Porsi 5 Diagnosis Teratas</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getTopPieData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {getTopPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom list description below chart */}
                <div className="mt-2 grid grid-cols-5 gap-1 text-[9px] font-bold text-slate-500 text-center">
                  {topDiagnosa.slice(0, 5).map((item, index) => (
                    <div key={index} className="truncate">
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {item.icd_kode}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Box 2: Timeline Trend for Top 5 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="bg-white rounded-2xl p-5 flex flex-col h-[320px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Tren Kunjungan Harian</h3>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  {timelineData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400 font-medium">
                      Data tren tidak tersedia
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          {top5Codes.map((code, idx) => (
                            <linearGradient key={code} id={`color-${code}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="tanggal" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(str) => {
                            const p = str.split('-');
                            return p.length === 3 ? `${p[2]}/${p[1]}` : str;
                          }}
                        />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} width={20} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                          labelStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        {top5Codes.map((code, idx) => (
                          <Area
                            key={code}
                            type="monotone"
                            dataKey={code}
                            stroke={COLORS[idx % COLORS.length]}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill={`url(#color-${code})`}
                            name={`Diagnosa ${code}`}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

            </div>

            {/* List and Table Grid of all diagnoses */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="bg-white rounded-3xl p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Stethoscope className="h-4.5 w-4.5 text-teal-600" />
                    Daftar Diagnosis Terbanyak
                  </h3>
                  <p className="text-slate-500 text-[10px]">
                    Klik pada baris tabel untuk melihat rincian karakteristik demografi penderita secara mendalam.
                  </p>
                </div>
                {/* Search input inside list section */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari kode ICD atau deskripsi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Table list of diagnoses */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100/70 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Kode ICD-10</th>
                      <th className="py-3 px-4">Nama Penyakit (Deskripsi)</th>
                      <th className="py-3 px-4 text-center">Total Kasus</th>
                      <th className="py-3 px-4 text-center">R. Jalan</th>
                      <th className="py-3 px-4 text-center">IGD</th>
                      <th className="py-3 px-4 text-center">R. Inap</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 text-xs">
                    {filteredDiagnoses.map((item, idx) => (
                      <tr 
                        key={item.icd_kode} 
                        onClick={() => setSelectedDiag(item)}
                        className={`cursor-pointer transition-colors group ${selectedDiag?.icd_kode === item.icd_kode ? 'bg-teal-50/50 hover:bg-teal-50/70' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-teal-650">
                          {item.icd_kode}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {item.deskripsi}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-950">
                          {item.jumlah}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {item.rawat_jalan}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {item.igd}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">
                          {item.rawat_inap}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <ArrowRight className={`h-4 w-4 text-teal-600 transition-transform ${selectedDiag?.icd_kode === item.icd_kode ? 'translate-x-1 opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </td>
                      </tr>
                    ))}
                    {filteredDiagnoses.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                          Tidak ditemukan diagnosis yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>

          </div>

          {/* RIGHT SECTION: Deep Demographic Characteristics Panel per Diagnosis */}
          <div className="lg:col-span-4">
            <AnimatePresence mode="wait">
              {selectedDiag ? (
                <motion.div
                  key={selectedDiag.icd_kode}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="bg-white rounded-3xl p-6 shadow-xs space-y-6 sticky top-6"
                >
                  {/* Diagnosis Header */}
                  <div className="space-y-1 pb-4 border-b border-slate-100/70">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-50 text-teal-700 border border-teal-150">
                      Rincian Demografis Penderita
                    </span>
                    <h2 className="text-base font-black text-slate-900 tracking-tight flex items-baseline gap-2 mt-2">
                      <span className="font-mono text-teal-650">{selectedDiag.icd_kode}</span>
                      <span className="text-slate-550 font-normal text-xs">|</span>
                      <span className="text-slate-800 line-clamp-1">{selectedDiag.deskripsi}</span>
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Rangkuman profil gender dan kluster usia khusus untuk diagnosa medis terpilih.
                    </p>
                  </div>

                  {/* Summary Banner Card */}
                  {summary && (
                    <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center space-x-1.5 text-teal-900">
                        <Sparkles className="h-4 w-4 text-teal-600 animate-pulse" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Statistik Insight</span>
                      </div>
                      <div className="space-y-1.5 text-slate-650 text-xs">
                        <p>
                          Kasus didominasi oleh pasien bergender <span className="font-bold text-teal-800">{summary.genderDominance}</span>, 
                          dengan persentase <span className="font-mono font-bold text-teal-700">
                            {summary.genderDominance === 'Laki-laki' ? summary.lPercent : summary.pPercent}%
                          </span>.
                        </p>
                        <p>
                          Kelompok umur yang paling rentan terserang adalah kelompok <span className="font-bold text-indigo-700">{summary.maxAgeGroupName}</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Gender Distribution Pie Chart */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      Perbandingan Gender
                    </h4>
                    
                    <div className="flex items-center gap-4">
                      {/* Doughnut Chart */}
                      <div className="h-[120px] w-[120px] flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getGenderChartData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              dataKey="value"
                            >
                              {getGenderChartData().map((entry: any, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                              itemStyle={{ fontSize: '10px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legends with detail counters */}
                      <div className="flex-1 space-y-2 text-xxs font-medium text-slate-500">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs font-12px"></span>
                            Laki-laki
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedDiag.gender.L} Orang ({summary?.lPercent}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-pink-500 rounded-xs"></span>
                            Perempuan
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedDiag.gender.P} Orang ({summary?.pPercent}%)
                          </span>
                        </div>
                        {selectedDiag.gender['Tidak Diketahui'] > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 bg-slate-400 rounded-xs"></span>
                              Lainnya
                            </span>
                            <span className="font-mono font-bold text-slate-800">
                              {selectedDiag.gender['Tidak Diketahui']} Orang
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Age Group Distribution Chart */}
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                      Sebaran Kelompok Usia Pasien
                    </h4>

                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getAgeChartData()}
                          layout="vertical"
                          margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={8} width={90} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                            itemStyle={{ fontSize: '10px' }}
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Jumlah Pasien" barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Diagnostic details footer */}
                  <div className="bg-slate-50 p-3 rounded-2xl flex items-start space-x-2 border border-slate-50">
                    <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] leading-relaxed text-slate-500">
                      Data ini diperoleh secara otomatis berdasarkan penegakan diagnosa oleh DPJP pada rekam medis digital di unit Rawat Jalan, IGD, dan Rawat Inap.
                    </span>
                  </div>

                </motion.div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center text-slate-400 font-medium text-xs">
                  Pilih diagnosis pada tabel untuk memuat ringkasan karakteristik demografi penderita secara mendalam.
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}

    </div>
  );
}
