import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Filter, 
  Calendar, 
  User, 
  Layers, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api.js';

interface ActivityLog {
  id: number;
  email: string;
  action_type: string;
  module_name: string;
  description: string;
  created_at: string;
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Trigger page open log on mount
  useEffect(() => {
    const triggerPageOpenLog = async () => {
      try {
        await api.post('/logs', {
          action_type: 'VIEW',
          module_name: 'Log Aktivitas',
          description: 'Membuka dashboard log audit aktivitas user'
        });
      } catch (err) {
        console.warn('Gagal mencatat log pembukaan halaman:', err);
      }
    };
    triggerPageOpenLog();
  }, []);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/logs');
      setLogs(res.data || []);
    } catch (err: any) {
      console.error('Error fetching logs:', err);
      setError('Gagal memuat log aktivitas user dari database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs logic
  useEffect(() => {
    let result = [...logs];

    // Filter by action
    if (selectedAction !== 'ALL') {
      result = result.filter(l => l.action_type.toUpperCase() === selectedAction);
    }

    // Filter by module
    if (selectedModule !== 'ALL') {
      result = result.filter(l => l.module_name.toLowerCase() === selectedModule.toLowerCase());
    }

    // Filter by search query (email, module/fitur, action/aksi, description)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.email.toLowerCase().includes(q) || 
        l.description.toLowerCase().includes(q) || 
        l.module_name.toLowerCase().includes(q) ||
        l.action_type.toLowerCase().includes(q)
      );
    }

    // Filter by date
    if (selectedDateFilter !== 'ALL') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const sevenDaysAgo = todayStart - (7 * 24 * 60 * 60 * 1000);

      if (selectedDateFilter === 'TODAY') {
        result = result.filter(l => new Date(l.created_at).getTime() >= todayStart);
      } else if (selectedDateFilter === 'WEEK') {
        result = result.filter(l => new Date(l.created_at).getTime() >= sevenDaysAgo);
      }
    }

    setFilteredLogs(result);
    setCurrentPage(1);
  }, [logs, searchQuery, selectedAction, selectedModule, selectedDateFilter]);

  // Format date helper
  const formatIndoDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Get Action Badge Styles
  const getActionBadge = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'UPDATE':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'VIEW':
      default:
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
    }
  };

  // Group logs by user email to compute counts and percentages dynamically
  const userStats = React.useMemo(() => {
    const statsMap: { [email: string]: number } = {};
    filteredLogs.forEach(log => {
      const email = log.email || 'Sistem / Anonim';
      statsMap[email] = (statsMap[email] || 0) + 1;
    });
    const total = filteredLogs.length;
    return Object.entries(statsMap)
      .map(([email, count]) => ({
        email,
        count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredLogs]);

  // Get unique modules in the logs for filtering dropdown
  const uniqueModules = Array.from(new Set(logs.map(l => l.module_name))).filter(Boolean);

  // Pagination calculations
  const pageSize = 100;
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = React.useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header controls layout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-600" />
            <span>Log Audit &amp; Aktivitas Petugas (Audit Trail)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Mencatat aktivitas tambah data (CRUD) serta penelusuran fitur/modul klinis secara real-time disertai detail akun email petugas.
          </p>
        </div>

        <button
          id="btn-refresh-logs"
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl shadow-sm border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer text-xs"
          style={{ minHeight: '44px' }}
        >
          <RefreshCw className={`h-4 w-4 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {!loading && !error && logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Stat Card - Total Logs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Log Tercatat</span>
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{filteredLogs.length}</span>
              <span className="text-xs text-slate-500 block">
                {filteredLogs.length === logs.length 
                  ? 'Seluruh aktivitas audit trail tersimpan' 
                  : 'Log aktivitas tersaring dari pencarian'}
              </span>
            </div>
            <div className="bg-teal-50 border border-teal-100 p-3.5 rounded-2xl">
              <Activity className="h-6 w-6 text-teal-600" />
            </div>
          </div>

          {/* User Distribution Widget (Full width on md, occupies 2 cols) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm md:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Aktivitas &amp; Kontribusi per Petugas</h2>
              </div>
              <span className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-1 rounded font-bold">
                {userStats.length} User Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userStats.slice(0, 5).map((stat, idx) => (
                <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[180px]" title={stat.email}>
                      {stat.email}
                    </span>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                      {stat.percentage}%
                    </span>
                  </div>
                  
                  {/* Custom progress bar */}
                  <div className="w-full bg-slate-200/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Jumlah Kunjungan / Log</span>
                    <span className="text-slate-800 font-bold">{stat.count} log</span>
                  </div>
                </div>
              ))}
              {userStats.length > 5 && (
                <div className="sm:col-span-2 lg:col-span-3 text-center text-[10px] text-slate-400 font-semibold italic">
                  + {userStats.length - 5} user lainnya tercatat di log audit
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and search bar card */}
      <div id="logs-filters-container" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Filter className="h-4 w-4 text-teal-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filter &amp; Penelusuran</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search box */}
          <div>
            <label htmlFor="filter-search-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Kata Kunci</label>
            <div className="relative">
              <input
                id="filter-search-input"
                type="text"
                placeholder="Cari email, fitur, aksi, deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-sans"
                style={{ minHeight: '38px' }}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label htmlFor="filter-action-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Tipe Aksi</label>
            <select
              id="filter-action-select"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer font-sans"
              style={{ minHeight: '38px' }}
            >
              <option value="ALL">Semua Aksi (CREATE/UPDATE/DELETE/VIEW)</option>
              <option value="CREATE">CREATE (Tambah Data)</option>
              <option value="UPDATE">UPDATE (Edit Data)</option>
              <option value="DELETE">DELETE (Hapus Data)</option>
              <option value="VIEW">VIEW (Buka Modul)</option>
            </select>
          </div>

          {/* Module */}
          <div>
            <label htmlFor="filter-module-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Fitur / Modul</label>
            <select
              id="filter-module-select"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer font-sans"
              style={{ minHeight: '38px' }}
            >
              <option value="ALL">Semua Fitur/Modul</option>
              {uniqueModules.map((mod, index) => (
                <option key={index} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {/* Date range helper */}
          <div>
            <label htmlFor="filter-date-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Rentang Waktu</label>
            <select
              id="filter-date-select"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all cursor-pointer font-sans"
              style={{ minHeight: '38px' }}
            >
              <option value="ALL">Semua Waktu</option>
              <option value="TODAY">Hari Ini</option>
              <option value="WEEK">7 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Logs Table Grid card */}
      <div id="logs-list-card" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Menyelaraskan audit trail log dari server...</p>
          </div>
        ) : error ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-rose-600 px-4 text-center">
            <ShieldAlert className="h-10 w-10 text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
            <button 
              id="btn-retry-logs"
              onClick={fetchLogs} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-200"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Clock className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold">Tidak ada log audit yang cocok dengan filter pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr className="text-slate-700 text-xs font-bold uppercase tracking-wider font-display">
                  <th scope="col" className="px-6 py-4">Waktu Kejadian (WIB)</th>
                  <th scope="col" className="px-6 py-4">Email User</th>
                  <th scope="col" className="px-6 py-4 text-center">Tipe Aksi</th>
                  <th scope="col" className="px-6 py-4">Fitur / Modul</th>
                  <th scope="col" className="px-6 py-4 max-w-md">Deskripsi Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs font-normal">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatIndoDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-slate-800 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <span className="font-mono text-xs text-slate-800 font-normal">{log.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg tracking-wider ${getActionBadge(log.action_type)}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-800 font-normal">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-teal-600 flex-shrink-0" />
                        <span>{log.module_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-800 text-xs font-normal font-sans leading-relaxed break-words max-w-md">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && !error && filteredLogs.length > 0 && totalPages > 1 && (
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 font-medium">
              Menampilkan <span className="font-bold text-slate-800">{((currentPage - 1) * pageSize) + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredLogs.length)}</span> dari <span className="font-bold text-slate-800">{filteredLogs.length}</span> log
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="prev-page-btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                style={{ minHeight: '36px' }}
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" />
                <span>Sebelumnya</span>
              </button>
              <span className="text-xs font-semibold text-slate-600 px-2 font-mono">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                id="next-page-btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center space-x-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                style={{ minHeight: '36px' }}
              >
                <span>Selanjutnya</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}

        {/* Footer info banner */}
        {!loading && !error && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-700 gap-2 font-semibold">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              <span>Sistem pencatatan log aktivitas aktif secara real-time.</span>
            </div>
            <div className="font-mono">
              Total Log: <span className="text-teal-700 font-extrabold">{filteredLogs.length}</span> baris
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
