import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Users, 
  Activity, 
  TrendingUp, 
  BarChart2, 
  Search, 
  Calendar, 
  ChevronRight,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import api from '../../services/api.js';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#1f2937']; // merah, kuning, hijau, hitam

const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    return `${day < 10 ? '0' + day : day} ${monthNames[monthIndex]} ${year}`;
  } catch (error) {
    return dateStr;
  }
};

export default function DashboardDokter() {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchDokter, setSearchDokter] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedDokter, setSelectedDokter] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/laporan/dokter', {
        params: { startDate, endDate }
      });
      setData(res.data);
      setSelectedDokter(null); // Reset selection on new fetch
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  const filteredDokter = data?.dokter?.filter((d: any) =>
    d.nama_dokter.toLowerCase().includes(searchDokter.toLowerCase())
  ) ?? [];

  const handleRowClick = (dokter: any) => {
    if (selectedDokter?.nama_dokter === dokter.nama_dokter) {
      setSelectedDokter(null);
    } else {
      setSelectedDokter(dokter);
    }
  };

  const getRataRataKunjungan = () => {
    if (!data || data.total_dokter_aktif === 0) return 0;
    return (data.total_kunjungan / data.total_dokter_aktif).toFixed(1);
  };

  const getDokterTersibuk = () => {
    if (!data?.dokter || data.dokter.length === 0) return { nama: '-', jumlah: 0 };
    const sibuk = data.dokter[0];
    return { nama: sibuk.nama_dokter, jumlah: sibuk.total_semua };
  };

  const tersibuk = getDokterTersibuk();

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Header */}
      <div className="bg-white p-6 border border-slate-100 shadow-sm rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Dashboard Kinerja Dokter DPJP</h1>
            <p className="text-sm text-slate-500 font-medium">
              Analitik kunjungan dan distribusi pelayanan per dokter penanggung jawab {data?.periode ? `(${formatIndonesianDate(data.periode.from)} s/d ${formatIndonesianDate(data.periode.to)})` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2 — Filter Bar */}
      <div className="bg-white p-4 border border-slate-100 shadow-sm rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 anim-fade-up">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <div className="flex items-center space-x-2 w-full">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl text-xs px-3 py-2 w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <span className="text-slate-400 font-medium text-xs">sd</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl text-xs px-3 py-2 w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="w-full sm:w-auto bg-teal-600 text-white rounded-xl text-xs font-medium px-5 py-2 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Lihat'}
          </button>
        </div>

        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari dokter..."
            value={searchDokter}
            onChange={(e) => setSearchDokter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-xl text-xs pl-9 pr-3 py-2 w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* SECTION 3 — KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 anim-fade-up anim-delay-1">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-500">Total Dokter Aktif</h3>
            <p className="text-xl font-semibold text-slate-800 mt-1">{data?.total_dokter_aktif || 0}</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-500">Total Kunjungan</h3>
            <p className="text-xl font-semibold text-slate-800 mt-1">{data?.total_kunjungan || 0}</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-600"></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-500">Dokter Tersibuk</h3>
            <p className="text-xl font-semibold text-slate-800 mt-1 truncate" title={tersibuk.nama}>{tersibuk.nama}</p>
            <p className="text-xs text-amber-600 font-medium mt-1">{tersibuk.jumlah} kunjungan</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
              <BarChart2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-medium text-slate-500">Rata-rata per Dokter</h3>
            <p className="text-xl font-semibold text-slate-800 mt-1">{getRataRataKunjungan()}</p>
            <p className="text-xs text-rose-600 font-medium mt-1">kunjungan / dokter</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-rose-500"></div>
        </div>
      </div>

      {/* SECTION 4 & 5 — Tabel & Detail */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden anim-fade-up anim-delay-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 w-12 text-center">#</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Nama Dokter</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-center">Rawat Jalan</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-center">IGD</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-center">Rawat Inap</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-center">Total Kunjungan</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                    <span className="text-xs font-medium">Memuat data...</span>
                  </td>
                </tr>
              ) : filteredDokter.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Stethoscope className="h-8 w-8 mb-2 text-slate-300" />
                      <span className="text-xs font-medium">Tidak ada data dokter ditemukan</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDokter.map((dokter: any, idx: number) => {
                  const isSelected = selectedDokter?.nama_dokter === dokter.nama_dokter;
                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-slate-50' : 'bg-white'}`}
                        onClick={() => handleRowClick(dokter)}
                      >
                        <td className="px-4 py-3 text-xs font-normal text-slate-700 text-center">{idx + 1}</td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-800">{dokter.nama_dokter}</td>
                        <td className="px-4 py-3 text-xs font-normal text-slate-700 text-center">{dokter.total_ralan}</td>
                        <td className="px-4 py-3 text-xs font-normal text-slate-700 text-center">{dokter.total_igd}</td>
                        <td className="px-4 py-3 text-xs font-normal text-slate-700 text-center">{dokter.total_ranap}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-teal-700 text-center bg-teal-50/50">{dokter.total_semua}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            className={`inline-flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isSelected ? 'bg-teal-100 text-teal-800' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                          >
                            Detail
                            {isSelected ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Expanded Detail Panel */}
                      {isSelected && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-100">
                            <div className="bg-slate-50/80 p-6 border-t border-slate-100 shadow-inner">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                
                                {/* Sub-section A: Chart Tren Harian */}
                                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm lg:col-span-2">
                                  <h4 className="text-sm font-semibold text-slate-800 mb-4">Tren Kunjungan Harian</h4>
                                  <div className="h-48 w-full">
                                    {dokter.tren_harian && dokter.tren_harian.length > 0 ? (
                                      <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dokter.tren_harian}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                          <XAxis 
                                            dataKey="tanggal" 
                                            tick={{ fontSize: 10, fill: '#64748b' }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tickFormatter={(val) => formatIndonesianDate(val)}
                                          />
                                          <YAxis 
                                            tick={{ fontSize: 10, fill: '#64748b' }} 
                                            axisLine={false} 
                                            tickLine={false}
                                            allowDecimals={false}
                                          />
                                          <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                                            labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
                                            labelFormatter={(val) => formatIndonesianDate(val)}
                                          />
                                          <Line 
                                            type="monotone" 
                                            dataKey="jumlah" 
                                            name="Kunjungan"
                                            stroke="#0d9488" 
                                            strokeWidth={3}
                                            dot={{ r: 3, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                                          />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                        Tidak ada data tren harian
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  {/* Sub-section B: Distribusi Triase IGD */}
                                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-4">Distribusi Triase IGD</h4>
                                    <div className="flex items-center gap-4">
                                      <div className="h-24 w-24">
                                        {dokter.total_igd > 0 ? (
                                          <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                              <Pie
                                                data={[
                                                  { name: 'Merah', value: dokter.triase_igd.merah },
                                                  { name: 'Kuning', value: dokter.triase_igd.kuning },
                                                  { name: 'Hijau', value: dokter.triase_igd.hijau },
                                                  { name: 'Hitam', value: dokter.triase_igd.hitam },
                                                ].filter(d => d.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={25}
                                                outerRadius={45}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                              >
                                                {[
                                                  { name: 'Merah', value: dokter.triase_igd.merah },
                                                  { name: 'Kuning', value: dokter.triase_igd.kuning },
                                                  { name: 'Hijau', value: dokter.triase_igd.hijau },
                                                  { name: 'Hitam', value: dokter.triase_igd.hitam },
                                                ].filter(d => d.value > 0).map((entry, index) => {
                                                  const colorIdx = ['Merah', 'Kuning', 'Hijau', 'Hitam'].indexOf(entry.name);
                                                  return <Cell key={`cell-${index}`} fill={COLORS[colorIdx]} />;
                                                })}
                                              </Pie>
                                              <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)', padding: '4px 8px' }}
                                                itemStyle={{ fontSize: '11px', fontWeight: 600, color: '#333' }}
                                              />
                                            </PieChart>
                                          </ResponsiveContainer>
                                        ) : (
                                          <div className="h-full flex items-center justify-center text-[10px] text-slate-400 text-center">
                                            Belum ada IGD
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="text-xs">
                                          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
                                          <span className="text-slate-500">Merah:</span> <span className="font-semibold text-slate-700">{dokter.triase_igd.merah}</span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                                          <span className="text-slate-500">Kuning:</span> <span className="font-semibold text-slate-700">{dokter.triase_igd.kuning}</span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                                          <span className="text-slate-500">Hijau:</span> <span className="font-semibold text-slate-700">{dokter.triase_igd.hijau}</span>
                                        </div>
                                        <div className="text-xs">
                                          <span className="inline-block w-2 h-2 rounded-full bg-slate-800 mr-1.5"></span>
                                          <span className="text-slate-500">Hitam:</span> <span className="font-semibold text-slate-700">{dokter.triase_igd.hitam}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sub-section C: Diagnosa Terbanyak */}
                                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Diagnosa Teratas</h4>
                                    {dokter.diagnosa_terbanyak && dokter.diagnosa_terbanyak.length > 0 ? (
                                      <div className="space-y-2.5">
                                        {dokter.diagnosa_terbanyak.map((diag: any, dIdx: number) => (
                                          <div key={dIdx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 shrink-0">
                                                {diag.kode}
                                              </span>
                                              <span className="text-xs text-slate-600 truncate" title={diag.deskripsi}>
                                                {diag.deskripsi}
                                              </span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-800 shrink-0 bg-slate-50 px-2 py-0.5 rounded-full">
                                              {diag.jumlah}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 text-center py-4">Belum ada diagnosa tercatat</p>
                                    )}
                                  </div>
                                </div>
                                
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
