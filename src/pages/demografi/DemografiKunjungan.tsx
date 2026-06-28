import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MapPin, 
  PieChart as ChartIcon, 
  Search, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Activity, 
  Sparkles, 
  X, 
  User, 
  Filter,
  BarChart2
} from 'lucide-react';
import api from '../../services/api.js';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

interface DemografiProps {
  activeTab: 'loyal' | 'wilayah' | 'pasien';
}

interface Patient {
  no_rm: string;
  nama: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string;
  alamat: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  total_visits: number;
}

interface RegionStat {
  kota?: string;
  kecamatan?: string;
  kelurahan?: string;
  jumlah_pasien: number;
  jumlah_kunjungan: number;
}

interface GenderStat {
  jenis_kelamin: string;
  jumlah: number;
}

interface AgeStat {
  kelompok_usia: string;
  jumlah: number;
}

interface VisitHistory {
  no_registrasi: string;
  tanggal_pelayanan: string;
  tipe: string;
  dpjp: string;
  icd: string;
}

export default function DemografiKunjungan() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'loyal' | 'wilayah' | 'pasien'>('pasien');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for API data
  const [topAllTime, setTopAllTime] = useState<Patient[]>([]);
  const [topPeriod, setTopPeriod] = useState<Patient[]>([]);
  const [byKota, setByKota] = useState<RegionStat[]>([]);
  const [byKecamatan, setByKecamatan] = useState<RegionStat[]>([]);
  const [byKelurahan, setByKelurahan] = useState<RegionStat[]>([]);
  const [byGender, setByGender] = useState<GenderStat[]>([]);
  const [byAgeGroup, setByAgeGroup] = useState<AgeStat[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modal / Sidebar history state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<VisitHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Recharts color constants
  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pelayanan/demografi/overview', {
        params: { startDate, endDate }
      });
      setTopAllTime(res.data.topAllTime || []);
      setTopPeriod(res.data.topPeriod || []);
      setByKota(res.data.byKota || []);
      setByKecamatan(res.data.byKecamatan || []);
      setByKelurahan(res.data.byKelurahan || []);
      setByGender(res.data.byGender || []);
      setByAgeGroup(res.data.byAgeGroup || []);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal memuat data demografi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchPatientHistory = async (patient: Patient) => {
    setSelectedPatient(patient);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/pelayanan/demografi/loyal-pasien/${patient.no_rm}`);
      setPatientHistory(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper calculation for patient age
  const calculateAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return '-';
    const birthDate = new Date(birthDateStr);
    const ageDifMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970) + ' Tahun';
  };

  const filteredPatientsAllTime = topAllTime.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.no_rm.includes(searchQuery)
  );

  const filteredPatientsPeriod = topPeriod.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.no_rm.includes(searchQuery)
  );

  const totalPatients = byGender.reduce((acc, curr) => acc + curr.jumlah, 0);

  return (
    <div className="space-y-6">
      {/* Upper Module Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-slate-100 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-teal-600" />
            <span>Demografi Kunjungan & Pasien</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {activeTab === 'loyal' && 'Daftar pasien dengan intensitas kunjungan klinik tertinggi (All-Time & Periodik).'}
            {activeTab === 'wilayah' && 'Analisis persebaran domisili pasien berdasarkan Kabupaten/Kota, Kecamatan, dan Kelurahan.'}
            {activeTab === 'pasien' && 'Analisis statistik profil gender dan kelompok usia pasien terdaftar.'}
          </p>
        </div>

        {/* Custom Tab selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl self-start md:self-center">
            <button
              onClick={() => setActiveTab('loyal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'loyal' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Pasien Loyal
            </button>
            <button
              onClick={() => setActiveTab('wilayah')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'wilayah' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Demografi Wilayah
            </button>
            <button
              onClick={() => setActiveTab('pasien')}
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${activeTab === 'pasien' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Demografi Pasien
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-xs">
          <div className="relative flex items-center justify-center">
            <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-teal-600"></div>
            <Activity className="absolute h-4 w-4 text-teal-600 animate-pulse" />
          </div>
          <p className="text-sm text-slate-500 mt-4 font-medium">Menganalisis data demografi...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center space-x-3">
          <X className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* VIEW TAB 1: PASIEN LOYAL */}
          {activeTab === 'loyal' && (
            <motion.div
              key="loyal-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Filter & Period Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 text-slate-850">
                    <Filter className="h-4.5 w-4.5 text-teal-600" />
                    <div>
                      <h3 className="text-sm font-bold font-display">Filter Periode Kunjungan</h3>
                      <p className="text-xxs text-slate-400">Pilih rentang tanggal untuk menganalisis loyalitas kunjungan.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-100 focus:ring-1 focus:ring-teal-550 outline-none text-slate-800 bg-slate-50 font-medium"
                    />
                    <span className="text-xs text-slate-400 font-medium">s/d</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-100 focus:ring-1 focus:ring-teal-550 outline-none text-slate-800 bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-xs flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Kunjungan Terdaftar</h4>
                    <span className="text-xl font-extrabold font-display text-slate-850">
                      {topAllTime.reduce((sum, p) => sum + p.total_visits, 0)} Kunjungan
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* 1. All-Time Top 20 */}
                <div className="bg-white rounded-2xl shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100/70 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-850 font-display">Top 20 Pasien Terloyal (All-Time)</h2>
                        <p className="text-xxs text-slate-400">Urutan pasien dengan total kunjungan kumulatif terbanyak.</p>
                      </div>
                    </div>
                    
                    {/* Compact Search */}
                    <div className="relative w-44">
                      <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari pasien..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 text-xxs w-full rounded-lg border border-slate-100 outline-none focus:ring-1 focus:ring-teal-550 bg-slate-50 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {filteredPatientsAllTime.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data pasien loyal ditemukan.</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xxs font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                            <th className="py-2.5 pl-2">Pasien</th>
                            <th className="py-2.5">No. RM</th>
                            <th className="py-2.5">Alamat / Wilayah</th>
                            <th className="py-2.5 text-right">Kunjungan</th>
                            <th className="py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredPatientsAllTime.map((p, index) => (
                            <tr key={p.no_rm} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 pl-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xxs font-bold ${index < 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {index + 1}
                                  </span>
                                  <div className="font-semibold text-slate-850 text-xs truncate max-w-[140px]">{p.nama}</div>
                                </div>
                              </td>
                              <td className="py-2 text-xxs font-mono font-medium text-slate-500">{p.no_rm}</td>
                              <td className="py-2 text-xxs text-slate-400 max-w-[120px] truncate">{p.kelurahan}, {p.kecamatan}</td>
                              <td className="py-2 text-right text-xs font-bold text-slate-800 pr-2">{p.total_visits}x</td>
                              <td className="py-2 text-center">
                                <button
                                  onClick={() => fetchPatientHistory(p)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex items-center cursor-pointer"
                                  title="Lihat Riwayat Pelayanan"
                                >
                                  <ChevronRight className="h-4.5 w-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* 2. Selected Period Top 20 */}
                <div className="bg-white rounded-2xl shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100/70 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-850 font-display">Top Pasien Periode Terpilih</h2>
                        <p className="text-xxs text-slate-400">Total kunjungan dalam rentang tanggal terfilter.</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {filteredPatientsPeriod.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-xs">Tidak ada data kunjungan pada periode terpilih.</div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-xxs font-bold text-slate-400 border-b border-slate-100/70 uppercase tracking-wider">
                            <th className="py-2.5 pl-2">Pasien</th>
                            <th className="py-2.5">No. RM</th>
                            <th className="py-2.5">Alamat / Wilayah</th>
                            <th className="py-2.5 text-right">Kunjungan</th>
                            <th className="py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredPatientsPeriod.map((p, index) => (
                            <tr key={p.no_rm} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 pl-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xxs font-bold ${index < 3 ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {index + 1}
                                  </span>
                                  <div className="font-semibold text-slate-850 text-xs truncate max-w-[140px]">{p.nama}</div>
                                </div>
                              </td>
                              <td className="py-2 text-xxs font-mono font-medium text-slate-500">{p.no_rm}</td>
                              <td className="py-2 text-xxs text-slate-400 max-w-[120px] truncate">{p.kelurahan}, {p.kecamatan}</td>
                              <td className="py-2 text-right text-xs font-bold text-slate-800 pr-2">{p.total_visits}x</td>
                              <td className="py-2 text-center">
                                <button
                                  onClick={() => fetchPatientHistory(p)}
                                  className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-teal-550/10 transition-colors inline-flex items-center cursor-pointer"
                                  title="Lihat Riwayat Pelayanan"
                                >
                                  <ChevronRight className="h-4.5 w-4.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW TAB 2: DEMOGRAFI WILAYAH */}
          {activeTab === 'wilayah' && (
            <motion.div
              key="wilayah-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Regional Cards Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-teal-50 text-teal-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Wilayah Kota</h4>
                    <span className="text-xl font-extrabold font-display text-slate-850">
                      {byKota.filter(c => c.kota !== 'Tidak Diketahui').length} Kota/Kab
                    </span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Kecamatan</h4>
                    <span className="text-xl font-extrabold font-display text-slate-850">
                      {byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').length} Kecamatan
                    </span>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-xs flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Kelurahan</h4>
                    <span className="text-xl font-extrabold font-display text-slate-850">
                      {byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').length} Kelurahan
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Persebaran Pasien */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-850 font-display">Grafik Pasien & Kunjungan Berdasarkan Kota/Kabupaten</h2>
                      <p className="text-xxs text-slate-400">Membandingkan jumlah pasien terdaftar (Bar) dengan total kunjungan (Line).</p>
                    </div>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byKota.filter(c => c.kota !== 'Tidak Diketahui')}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="kota" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={28} />
                        <Bar dataKey="jumlah_kunjungan" name="Total Kunjungan" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table Data list */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Data Populasi Wilayah (Kota)</h3>
                    <p className="text-xxs text-slate-400">Detail rincian pasien per domisili kabupaten/kota.</p>
                  </div>
                  <div className="overflow-y-auto max-h-72">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-xxs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <th className="py-2">Kabupaten / Kota</th>
                          <th className="py-2 text-right">Pasien</th>
                          <th className="py-2 text-right">Kunjungan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-55">
                        {byKota.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50/40">
                            <td className="py-2 font-medium text-slate-700">{item.kota}</td>
                            <td className="py-2 text-right text-slate-600 font-bold">{item.jumlah_pasien}</td>
                            <td className="py-2 text-right text-slate-600 font-bold">{item.jumlah_kunjungan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sub-Region Analysis by Kecamatan and Kelurahan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850 font-display">Sebaran Pasien di Tingkat Kecamatan</h3>
                      <p className="text-xxs text-slate-400 font-medium text-slate-500">Kecamatan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKecamatan.filter(k => k.kecamatan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="kecamatan" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-850 font-display">Sebaran Pasien di Tingkat Kelurahan</h3>
                      <p className="text-xxs text-slate-400 font-medium text-slate-500">Kelurahan teraktif berdasarkan jumlah pasien.</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={byKelurahan.filter(k => k.kelurahan !== 'Tidak Diketahui').slice(0, 7)}
                        margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="kelurahan" stroke="#94a3b8" fontSize={11} tickLine={false} width={80} />
                        <Tooltip />
                        <Bar dataKey="jumlah_pasien" name="Jumlah Pasien" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW TAB 3: DEMOGRAFI PASIEN */}
          {activeTab === 'pasien' && (
            <motion.div
              key="pasien-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gender Distribution Pie Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Proporsi Gender Pasien</h3>
                    <p className="text-xxs text-slate-400">Pembagian jumlah pasien terdaftar berdasarkan jenis kelamin.</p>
                  </div>

                  <div className="h-64 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byGender}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="jumlah"
                          nameKey="jenis_kelamin"
                        >
                          {byGender.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} Pasien`} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Summary of gender numeric data */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                    {byGender.map((item, index) => (
                      <div key={index} className="text-center">
                        <span className="text-xxs text-slate-400 font-bold block">{item.jenis_kelamin}</span>
                        <span className="text-base font-extrabold text-slate-850">
                          {item.jumlah} <span className="text-xxs text-slate-400 font-normal">({totalPatients > 0 ? ((item.jumlah / totalPatients) * 100).toFixed(1) : 0}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Age Group Distribution */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-150 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-850 font-display">Distribusi Berdasarkan Kelompok Usia</h3>
                    <p className="text-xxs text-slate-400">Pengelompokan usia klinis pasien terdaftar di database.</p>
                  </div>

                  <div className="h-80 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={byAgeGroup}
                        margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="kelompok_usia" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="jumlah" name="Jumlah Pasien" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={34}>
                          {byAgeGroup.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Patient Insight Summary Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1 relative z-10">
                  <h3 className="text-sm font-bold text-teal-900 flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-teal-600 animate-pulse" />
                    Insight Demografi Pasien
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    Berdasarkan visualisasi sebaran pasien, kelompok umur <span className="text-teal-700 font-semibold">{[...byAgeGroup].sort((a,b) => b.jumlah - a.jumlah)[0]?.kelompok_usia || 'Tidak Diketahui'}</span> merupakan populasi pasien tertinggi di Klinik Puri Medika. Dominasi gender adalah <span className="text-teal-700 font-semibold">{[...byGender].sort((a,b) => b.jumlah - a.jumlah)[0]?.jenis_kelamin || 'Tidak Diketahui'}</span>.
                  </p>
                </div>
                <div className="bg-white border border-teal-100 rounded-xl px-5 py-3 relative z-10 text-center flex-shrink-0 min-w-[160px] shadow-xs">
                  <span className="text-xxs text-slate-400 block uppercase font-bold tracking-wider">Total Pasien Terdaftar</span>
                  <span className="text-2xl font-black text-teal-600">{totalPatients} Jiwa</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Patient History Modal Side-Drawer */}
      <AnimatePresence>
        {selectedPatient && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatient(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 pointer-events-auto"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:max-w-md bg-white text-slate-800 shadow-2xl z-55 border-l border-slate-200 flex flex-col pointer-events-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-teal-50 border border-teal-150 flex items-center justify-center font-bold text-teal-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 font-display uppercase tracking-wider">Profil & Riwayat Pasien</h3>
                    <span className="text-xxs text-teal-600 font-mono">No. RM: {selectedPatient.no_rm}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                  style={{ minHeight: '36px', minWidth: '36px' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Patient Basic Profile details */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-150 space-y-4">
                <h4 className="text-xxs uppercase tracking-wider text-teal-650 font-bold">Informasi Demografis</h4>
                <div className="grid grid-cols-2 gap-4 text-xxs font-medium text-slate-550">
                  <div>
                    <span className="text-slate-450 block">Nama Pasien</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.nama}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Jenis Kelamin</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.jenis_kelamin === 'L' ? 'Laki-laki' : selectedPatient.jenis_kelamin === 'P' ? 'Perempuan' : selectedPatient.jenis_kelamin}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Kelompok Usia (Lahir)</span>
                    <span className="text-slate-800 text-xs font-semibold">{calculateAge(selectedPatient.tanggal_lahir)}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block">Wilayah Domisili</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.kota}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-450 block">Alamat Lengkap</span>
                    <span className="text-slate-800 text-xs font-semibold">{selectedPatient.alamat}</span>
                  </div>
                </div>
              </div>

              {/* History Timeline of Visits */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-xxs uppercase tracking-wider text-teal-650 font-bold">Daftar Kunjungan All-Time</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-550 text-teal-750 border border-teal-150">
                    {selectedPatient.total_visits} Kali
                  </span>
                </div>

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    <span className="text-xxs text-slate-400 mt-2">Memuat riwayat...</span>
                  </div>
                ) : patientHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-550 font-medium">Belum ada catatan riwayat kunjungan pelayanan.</div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {patientHistory.map((item, idx) => (
                      <div key={idx} className="relative pl-7 group">
                        {/* Timeline node */}
                        <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-white border-2 border-teal-500 group-hover:bg-teal-500 transition-colors" />
                        
                        <div className="bg-slate-50 hover:bg-slate-100/70 transition-colors p-4 rounded-xl border border-slate-150/85 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-medium text-slate-550 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {item.tanggal_pelayanan}
                            </span>
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                              item.tipe === 'Rawat Jalan' ? 'bg-teal-50 text-teal-700 border-teal-150' :
                              item.tipe === 'IGD' ? 'bg-amber-50 text-amber-700 border-amber-150' :
                              'bg-indigo-50 text-indigo-700 border-indigo-150'
                            }`}>
                              {item.tipe}
                            </span>
                          </div>

                          <div className="text-xxs font-medium">
                            <span className="text-slate-400 block">DPJP / Dokter Pelaksana</span>
                            <span className="text-slate-700 font-semibold">{item.dpjp}</span>
                          </div>

                          <div className="text-xxs font-medium bg-white p-2 rounded-lg border border-slate-150/70">
                            <span className="text-slate-400 block">Diagnosa ICD-10</span>
                            <span className="text-slate-600 font-mono font-bold">{item.icd}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
