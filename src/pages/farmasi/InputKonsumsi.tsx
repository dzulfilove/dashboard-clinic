import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Pill, 
  Calendar, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  Calculator, 
  ArrowRightLeft,
  AlertCircle,
  Search,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Download,
  CalendarDays,
  FileSpreadsheet
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
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'motion/react';
import SaldoAwal from '../../components/SaldoAwal.js';

const COLORS = ['#0d9488', '#4f46e5', '#f59e0b', '#ef4444', '#1e293b', '#ec4899', '#8b5cf6'];

import api from '../../services/api.js';
import { ObatMaster, ObatKonsumsi } from '../../types.js';

export default function InputKonsumsi() {
  const { user } = useAuthStore();
  const [medicines, setMedicines] = useState<ObatMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRows, setSavingRows] = useState<{ [id: number]: boolean }>({});
  
  // Helper for today's date in local YYYY-MM-DD
  const getTodayDateString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Grid rows input state mapping obat_id to separate cells
  const [rowInputs, setRowInputs] = useState<{
    [id: number]: {
      stok_awal: string;
      penerimaan: string;
      pemakaian: string;
      retur_hilang: string;
    };
  }>({});

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Statistics states and controllers
  const [activeTab, setActiveTab] = useState<'input' | 'stats' | 'saldo'>('stats');
  const [statsStartDate, setStatsStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const tzoffset = d.getTimezoneOffset() * 60000;
    return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 10);
  });
  const [statsEndDate, setStatsEndDate] = useState(getTodayDateString);
  const [statsLogs, setStatsLogs] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadStatisticsLogs = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get(`/obat/konsumsi?start_date=${statsStartDate}&end_date=${statsEndDate}`);
      setStatsLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('Gagal mengambil statistik harian:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStatisticsLogs();
    }
  }, [statsStartDate, statsEndDate, activeTab]);

  // 1. Fetch medicines
  const loadMedicinesAndLogs = async () => {
    try {
      setLoading(true);
      setFeedback(null);

      const [medRes, logsRes] = await Promise.all([
        api.get('/obat/master'),
        api.get(`/obat/konsumsi?tanggal=${selectedDate}`)
      ]);

      const activeMeds: ObatMaster[] = Array.isArray(medRes.data)
        ? medRes.data.filter((m: ObatMaster) => m.is_active === 1)
        : [];
      const existingLogs: any[] = Array.isArray(logsRes.data) ? logsRes.data : [];

      setMedicines(activeMeds);

      // Build row input mappings
      const initialMap: typeof rowInputs = {};
      activeMeds.forEach(m => {
        const match = existingLogs.find(log => log.obat_id === m.id);
        if (match) {
          initialMap[m.id] = {
            stok_awal: String(match.stok_awal),
            penerimaan: String(match.penerimaan),
            pemakaian: String(match.pemakaian),
            retur_hilang: String(match.retur_hilang || 0)
          };
        } else {
          const suggestedStock = m.stok_akhir !== undefined 
            ? String(m.stok_akhir) 
            : String(m.saldo_awal_nilai || '');
          initialMap[m.id] = {
            stok_awal: suggestedStock,
            penerimaan: '',
            pemakaian: '',
            retur_hilang: ''
          };
        }
      });

      setRowInputs(initialMap);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal mendownload data konsumsi obat.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicinesAndLogs();
  }, [selectedDate]);

  const handleCellChange = (obatId: number, field: 'stok_awal' | 'penerimaan' | 'pemakaian' | 'retur_hilang', val: string) => {
    if (val !== '' && !/^\d+$/.test(val)) return;
    setRowInputs(prev => ({
      ...prev,
      [obatId]: {
        ...prev[obatId],
        [field]: val
      }
    }));
  };

  const getSisaStok = (obatId: number) => {
    const inputs = rowInputs[obatId];
    if (!inputs) return 0;
    const sawal = inputs.stok_awal ? Number(inputs.stok_awal) : 0;
    const terima = inputs.penerimaan ? Number(inputs.penerimaan) : 0;
    const pakai = inputs.pemakaian ? Number(inputs.pemakaian) : 0;
    const retur = inputs.retur_hilang ? Number(inputs.retur_hilang) : 0;
    return sawal + terima - pakai - retur;
  };

  // Save row
  const handleSaveRow = async (obatId: number) => {
    const inputs = rowInputs[obatId];
    if (!inputs) return;

    setSavingRows(prev => ({ ...prev, [obatId]: true }));
    setFeedback(null);

    const sawal = inputs.stok_awal === '' ? 0 : Number(inputs.stok_awal);
    const terima = inputs.penerimaan === '' ? 0 : Number(inputs.penerimaan);
    const pakai = inputs.pemakaian === '' ? 0 : Number(inputs.pemakaian);
    const retur = inputs.retur_hilang === '' ? 0 : Number(inputs.retur_hilang);

    try {
      await api.post('/obat/konsumsi', {
        obat_id: obatId,
        tanggal: selectedDate,
        stok_awal: sawal,
        penerimaan: terima,
        pemakaian: pakai,
        retur_hilang: retur
      });

      // Show temporary single success
      const oName = medicines.find(m => m.id === obatId)?.nama_obat;
      setFeedback({ 
        type: 'success', 
        msg: `Laporan harian obat ${oName} disimpan untuk tanggal ${selectedDate}.` 
      });

    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', msg: 'Gagal menyimpan baris obat: ' + (err.response?.data?.message || err.message) });
    } finally {
      setSavingRows(prev => ({ ...prev, [obatId]: false }));
    }
  };

  // Bulk save all rows
  const handleSaveAll = async () => {
    setLoading(true);
    setFeedback(null);
    let successCount = 0;
    let failedCount = 0;

    for (const med of medicines) {
      const inputs = rowInputs[med.id];
      if (!inputs) continue;
      const sawal = inputs.stok_awal === '' ? 0 : Number(inputs.stok_awal);
      const terima = inputs.penerimaan === '' ? 0 : Number(inputs.penerimaan);
      const pakai = inputs.pemakaian === '' ? 0 : Number(inputs.pemakaian);
      const retur = inputs.retur_hilang === '' ? 0 : Number(inputs.retur_hilang);

      try {
        await api.post('/obat/konsumsi', {
          obat_id: med.id,
          tanggal: selectedDate,
          stok_awal: sawal,
          penerimaan: terima,
          pemakaian: pakai,
          retur_hilang: retur
        });
        successCount++;
      } catch (e) {
        failedCount++;
      }
    }

    setLoading(false);
    if (failedCount === 0) {
      setFeedback({ type: 'success', msg: `Seluruh (${successCount}) rekap data harian konsumsi obat berhasil disimpan ke database.` });
    } else {
      setFeedback({ type: 'error', msg: `Berhasil menyimpan ${successCount} obat, tetapi ${failedCount} obat mengalami kegagalan.` });
    }
  };

  const [statsSearchQuery, setStatsSearchQuery] = useState('');

  const filteredMedicines = (Array.isArray(medicines) ? medicines : []).filter(m => 
    m.nama_obat.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.kode_obat.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.golongan && m.golongan.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compile statistics summaries
  const statsSummary = React.useMemo(() => {
    let totalPemakaian = 0;
    let totalPenerimaan = 0;
    let totalReturHilang = 0;
    const medicineMap: { [id: number]: { id: number; kode: string; nama: string; golongan: string; pemakaian: number; penerimaan: number; retur: number; sisa: number; lastDate: string } } = {};

    statsLogs.forEach(log => {
      totalPemakaian += Number(log.pemakaian) || 0;
      totalPenerimaan += Number(log.penerimaan) || 0;
      totalReturHilang += Number(log.retur_hilang) || 0;

      const oId = log.obat_id;
      if (!medicineMap[oId]) {
        medicineMap[oId] = {
          id: oId,
          kode: log.kode_obat || '-',
          nama: log.nama_obat || '-',
          golongan: log.golongan || '-',
          pemakaian: 0,
          penerimaan: 0,
          retur: 0,
          sisa: 0,
          lastDate: ''
        };
      }
      const mStats = medicineMap[oId];
      mStats.pemakaian += Number(log.pemakaian) || 0;
      mStats.penerimaan += Number(log.penerimaan) || 0;
      mStats.retur += Number(log.retur_hilang) || 0;

      if (!mStats.lastDate || log.tanggal >= mStats.lastDate) {
        mStats.lastDate = log.tanggal;
        mStats.sisa = Number(log.sisa_stok) || 0;
      }
    });

    const medicineList = Object.values(medicineMap).sort((a, b) => b.pemakaian - a.pemakaian);
    const topMedicines = medicineList.slice(0, 5); // top 5 for bar charts

    // Timeline format
    const timelineMap: { [t: string]: { tanggal_label: string; pemakaian: number; penerimaan: number } } = {};
    statsLogs.forEach(log => {
      const t = log.tanggal; // YYYY-MM-DD
      if (!timelineMap[t]) {
        let dLabel = t;
        try {
          const parts = t.split('-');
          if (parts.length === 3) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            dLabel = `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
          }
        } catch (e) {}

        timelineMap[t] = {
          tanggal_label: dLabel,
          pemakaian: 0,
          penerimaan: 0
        };
      }
      timelineMap[t].pemakaian += Number(log.pemakaian) || 0;
      timelineMap[t].penerimaan += Number(log.penerimaan) || 0;
    });

    const timelineData = Object.entries(timelineMap)
      .map(([t, val]) => ({
        tanggal: t,
        tanggal_label: val.tanggal_label,
        pemakaian: val.pemakaian,
        penerimaan: val.penerimaan
      }))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // Top medicine
    const firstRanked = medicineList[0] ? medicineList[0].nama : '-';
    const firstRankedQty = medicineList[0] ? medicineList[0].pemakaian : 0;

    return {
      totalPemakaian,
      totalPenerimaan,
      totalReturHilang,
      medicineList,
      topMedicines,
      timelineData,
      topMedInfo: { name: firstRanked, qty: firstRankedQty }
    };
  }, [statsLogs]);

  const filteredStatsMedicines = React.useMemo(() => {
    return statsSummary.medicineList.filter(m => 
      m.nama.toLowerCase().includes(statsSearchQuery.toLowerCase()) ||
      m.kode.toLowerCase().includes(statsSearchQuery.toLowerCase()) ||
      m.golongan.toLowerCase().includes(statsSearchQuery.toLowerCase())
    );
  }, [statsSummary.medicineList, statsSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Navigation Headers and controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Pill className="h-5 w-5 text-teal-600" />
            <span>Form &amp; Analitik Konsumsi Obat Harian</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Input lembar log harian arus logistik serta analisis tren penggunaan obat klinis secara berkala.
          </p>
        </div>

        {/* Tab Selection Navigation Header */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-input"
            onClick={() => setActiveTab('input')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'input' 
                ? 'bg-white text-teal-700 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{ minHeight: '36px' }}
          >
            <Pill className="h-4 w-4" />
            <span>Form Input Harian</span>
          </button>
          <button
            id="tab-btn-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stats' 
                ? 'bg-white text-teal-700 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{ minHeight: '36px' }}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Statistik &amp; Chart</span>
          </button>
          <button
            id="tab-btn-saldo"
            onClick={() => setActiveTab('saldo')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'saldo' 
                ? 'bg-white text-teal-700 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            style={{ minHeight: '36px' }}
          >
            <Calculator className="h-4 w-4" />
            <span>Saldo Awal</span>
          </button>
        </div>
      </div>

      {activeTab === 'saldo' ? (
        <SaldoAwal />
      ) : activeTab === 'stats' ? (
        <div className="space-y-6">
          {/* Rentang Tanggal Filter UI Card */}
          <div className="bg-white p-4.5 border border-slate-150 shadow-xs rounded-2xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-teal-600" />
              <span>Filter Rentang Tanggal Analisis</span>
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Mulai</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="stats-start-date"
                    value={statsStartDate}
                    onChange={(e) => setStatsStartDate(e.target.value)}
                    className="pl-9 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-xs font-semibold"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-center pt-4 text-slate-350 hidden sm:block">
                <ArrowRightLeft className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Selesai</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    id="stats-end-date"
                    value={statsEndDate}
                    onChange={(e) => setStatsEndDate(e.target.value)}
                    className="pl-9 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-xs font-semibold"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {statsLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
              <span>Membuat visualisasi analitik log harian...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPI metrics cards - Bento box style exactly like Rawat Jalan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Total Pemakaian */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-teal-50 text-teal-700 rounded-xl group-hover:scale-105 transition-transform">
                      <TrendingUp className="h-6 w-6 text-teal-600" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-teal-100/80 text-teal-800 px-2.5 py-0.5 rounded-full">
                      Pemakaian
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {statsSummary.totalPemakaian.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-450">Unit</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Pemakaian Obat Klinis</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-teal-600"></div>
                </motion.div>

                {/* 2. Total Penerimaan */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl group-hover:scale-105 transition-transform">
                      <Download className="h-6 w-6 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-indigo-100/80 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      Penerimaan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {statsSummary.totalPenerimaan.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-450">Unit</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Total Penerimaan Stok Penyuplai</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-600"></div>
                </motion.div>

                {/* 3. Total Retur/Hilang */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-amber-50 text-amber-700 rounded-xl group-hover:scale-105 transition-transform">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-amber-100/80 text-amber-850 px-2.5 py-0.5 rounded-full">
                      Penyusutan
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight font-display">
                      {statsSummary.totalReturHilang.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-450">Unit</span>
                    </h3>
                    <p className="text-xxs font-normal text-slate-500 mt-1">Beban Kerusakan, Hilang, atau Retur</p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
                </motion.div>

                {/* 4. Konsumsi Terbanyak */}
                <motion.div 
                  whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-rose-50 text-rose-750 rounded-xl group-hover:scale-105 transition-transform">
                      <Pill className="h-6 w-6 text-rose-600" />
                    </div>
                    <span className="text-[10px] font-mono font-medium bg-rose-100/80 text-rose-800 px-2.5 py-0.5 rounded-full">
                      Terbanyak
                    </span>
                  </div>
                  <div className="mt-4 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight font-display truncate" title={statsSummary.topMedInfo.name}>
                      {statsSummary.topMedInfo.name || '-'}
                    </h3>
                    <p className="text-xxs font-mono text-rose-600 font-extrabold mt-1">
                      {statsSummary.topMedInfo.qty.toLocaleString('id-ID')} Unit Terpakai
                    </p>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-rose-500"></div>
                </motion.div>

              </div>

              {/* Graphical trends exactly like Rawat Jalan (ComposedChart & PieChart) */}
              {statsSummary.timelineData.length === 0 ? (
                <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-150">
                  <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Tidak ditemukan riwayat log konsumsi pada rentang tanggal ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Chart 1: Tren Arus Logistik Obat Harian */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs lg:col-span-2 space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">Grafik Tren Arus Logistik Obat Harian</h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Laporan pemakaian dan penerimaan obat klinis (dalam satuan unit)</p>
                    </div>

                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={statsSummary.timelineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="tanggal_label" fontSize={10} tickLine={false} stroke="#94a3b8" />
                          <YAxis yAxisId="left" fontSize={10} tickLine={false} stroke="#0d9488" label={{ value: 'Pemakaian (unit)', angle: -90, position: 'insideLeft', style: {fontSize: 9, fill: '#0d9488'} }} />
                          <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} stroke="#4f46e5" label={{ value: 'Penerimaan (unit)', angle: 90, position: 'insideRight', style: {fontSize: 9, fill: '#4f46e5'} }} />
                          <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff' }} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar yAxisId="left" dataKey="pemakaian" name="Pemakaian" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          <Line yAxisId="right" type="monotone" dataKey="penerimaan" name="Penerimaan" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: 5 Obat Berpengaruh Terbesar (PieChart distribution) */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-150/60 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-wide font-display">5 Obat Berpengaruh Terbesar</h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Proporsi volume pemakaian obat kumulatif harian</p>
                    </div>

                    <div className="h-[250px] flex items-center justify-center">
                      {statsSummary.topMedicines.length === 0 ? (
                        <div className="text-slate-350 text-xs font-mono">Belum ada pemakaian obat tercatat</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statsSummary.topMedicines}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="pemakaian"
                            >
                              {statsSummary.topMedicines.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Legends exact list design */}
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {statsSummary.topMedicines.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between text-[11px] font-medium text-slate-650 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center space-x-2 truncate max-w-[12rem]">
                            <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="truncate">{item.nama}</span>
                          </div>
                          <span className="font-bold text-slate-800">{item.pemakaian} unit</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Detailed range compilation table */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Rincian Konsumsi Kumulatif per Obat
                    </h3>
                    <p className="text-slate-450 text-xxs mt-0.5 font-medium">Laporan total pemakaian, penerimaan, retur, serta sisa stok logistik obat pada periode terpilih.</p>
                  </div>

                  {/* Search inside compiled stats */}
                  <div className="relative rounded-xl shadow-xs w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="search-stats-medicine"
                      type="text"
                      placeholder="Cari rincian obat..."
                      value={statsSearchQuery}
                      onChange={(e) => setStatsSearchQuery(e.target.value)}
                      className="pl-9 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kode &amp; Nama Obat</th>
                          <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Golongan</th>
                          <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total Pemakaian</th>
                          <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total Penerimaan</th>
                          <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Total Retur/Hilang</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Stok Akhir Terakhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 text-xs font-normal">
                        {filteredStatsMedicines.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                              Tidak ada log obat yang cocok dengan pencarian Anda.
                            </td>
                          </tr>
                        ) : (
                          filteredStatsMedicines.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-3.5">
                                <div>
                                  <span className="font-mono text-xxs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                    {m.kode}
                                  </span>
                                  <h4 className="font-bold text-slate-900 mt-1 text-xs">{m.nama}</h4>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                                {m.golongan}
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono font-bold text-teal-700">
                                {m.pemakaian} <span className="text-[10px] font-normal text-slate-400">unit</span>
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono text-slate-700">
                                {m.penerimaan} <span className="text-[10px] font-normal text-slate-400">unit</span>
                              </td>
                              <td className="px-5 py-3.5 text-center whitespace-nowrap font-mono text-slate-600">
                                {m.retur} <span className="text-[10px] font-normal text-slate-400">unit</span>
                              </td>
                              <td className="px-6 py-3.5 text-right whitespace-nowrap font-mono font-bold text-slate-900 bg-slate-50/30">
                                {m.sisa} <span className="text-[10px] font-normal text-slate-450">unit</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Form input controls - Date Selector Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-150 shadow-xs rounded-2xl">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <span className="text-xs font-bold text-slate-505">Tanggal Laporan:</span>
              <input
                type="date"
                id="input-tanggal-cons"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-lg border-none text-slate-800 focus:outline-none cursor-pointer"
                style={{ minHeight: '32px' }}
              />
            </div>
            
            <div className="text-xxs font-medium text-slate-400">
              Menampilkan {filteredMedicines.length} dari {medicines.length} master obat aktif
            </div>
          </div>

          {/* Search Input Box */}
          <div className="bg-white p-3.5 border border-slate-150 shadow-xs rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative rounded-xl shadow-xs w-full md:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="search-konsumsi-obat"
                type="text"
                placeholder="Cari obat berdasarkan nama, kode, atau golongan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-xs font-semibold"
              />
            </div>
          </div>

          {feedback && (
            <div id="cons-feedback-alert" className={`p-4 rounded-xl border flex items-center space-x-2 text-sm font-semibold ${
              feedback.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 'bg-rose-50 border-rose-150 text-rose-800'
            }`}>
              {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
              <span>{feedback.msg}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
              <span>Sinkronisasi jurnal konsumsi logistik...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kode &amp; Nama Obat</th>
                        <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 w-24">Stok Awal</th>
                        <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 w-24">Penerimaan</th>
                        <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 w-24">Pemakaian</th>
                        <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 w-24">Retur / Hilang</th>
                        <th scope="col" className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500 w-28">Sisa Stok</th>
                        {(user?.role === 'admin' || user?.role === 'farmasi') && (
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-24">Simpan</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 text-xs font-normal">
                      {filteredMedicines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                            Tidak ditemukan obat yang cocok dengan pencarian Anda.
                          </td>
                        </tr>
                      ) : (
                        filteredMedicines.map((m) => {
                          const inputs = rowInputs[m.id] || { stok_awal: '', penerimaan: '', pemakaian: '', retur_hilang: '' };
                          const sisa = getSisaStok(m.id);
                          const isSaving = savingRows[m.id] || false;

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-6 py-3">
                                <div>
                                  <span className="font-mono text-xxs font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                                    {m.kode_obat}
                                  </span>
                                  <h4 className="font-medium text-slate-900 mt-1 text-xs">{m.nama_obat}</h4>
                                  <p className="text-xxs text-slate-400 font-medium mt-0.5 uppercase tracking-wider">{m.golongan} • {m.kemasan}</p>
                                </div>
                              </td>

                              {/* Stok Awal Input Cell */}
                              <td className="px-5 py-3 text-center whitespace-nowrap">
                                <input
                                  id={`sawal-${m.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={inputs.stok_awal}
                                  onChange={(e) => handleCellChange(m.id, 'stok_awal', e.target.value)}
                                  className="w-20 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  placeholder="0"
                                />
                              </td>

                              {/* Penerimaan Input Cell */}
                              <td className="px-5 py-3 text-center whitespace-nowrap">
                                <input
                                  id={`terima-${m.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={inputs.penerimaan}
                                  onChange={(e) => handleCellChange(m.id, 'penerimaan', e.target.value)}
                                  className="w-20 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  placeholder="0"
                                />
                              </td>

                              {/* Pemakaian Input Cell */}
                              <td className="px-5 py-3 text-center whitespace-nowrap">
                                <input
                                  id={`pakai-${m.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={inputs.pemakaian}
                                  onChange={(e) => handleCellChange(m.id, 'pemakaian', e.target.value)}
                                  className="w-20 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                                  placeholder="0"
                                />
                              </td>

                              {/* Retur / Hilang Input Cell */}
                              <td className="px-5 py-3 text-center whitespace-nowrap">
                                <input
                                  id={`retur-${m.id}`}
                                  type="text"
                                  inputMode="numeric"
                                  value={inputs.retur_hilang}
                                  onChange={(e) => handleCellChange(m.id, 'retur_hilang', e.target.value)}
                                  className="w-20 text-center py-1 bg-amber-50/50 border border-amber-200 rounded-lg text-amber-900 font-mono text-xs font-normal focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                                  placeholder="0"
                                />
                              </td>

                              {/* Dynamically Calulcated Sisa Stok Cell */}
                              <td className="px-5 py-3 text-center whitespace-nowrap">
                                <span className={`text-xs font-semibold font-mono ${sisa < 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {sisa}
                                </span>
                              </td>

                              {/* Individual Save action */}
                              {(user?.role === 'admin' || user?.role === 'farmasi') && (
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                  <button
                                    id={`save-row-${m.id}`}
                                    onClick={() => handleSaveRow(m.id)}
                                    disabled={isSaving}
                                    className="p-2 bg-teal-50 hover:bg-teal-600 border border-teal-250 text-teal-700 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center mx-auto"
                                    title="Simpan baris obat ini"
                                    style={{ minHeight: '44px', minWidth: '44px' }}
                                  >
                                    <Save className="h-4.5 w-4.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sheet Bulk Submit controls */}
              {(user?.role === 'admin' || user?.role === 'farmasi') && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-teal-600 text-white rounded-xl">
                      <Calculator className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">Lembar Form Konsumsi Obat Harian</h4>
                      <p className="text-xxs text-slate-400 mt-1">Anda dapat memperbarui semua data inventori hari ini dengan satu klik tindakan.</p>
                    </div>
                  </div>

                  <button
                    id="save-all-cons-btn"
                    onClick={handleSaveAll}
                    className="flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-550 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <Save className="h-5 w-5" />
                    <span>Simpan Semua Perubahan</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
