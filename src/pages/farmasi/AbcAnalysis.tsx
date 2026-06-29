import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Layers, 
  Calendar, 
  RefreshCw, 
  DollarSign, 
  AlertTriangle,
  Award,
  BookOpen,
  PieChart,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import api from '../../services/api.js';
import { AbcItem, AbcResult } from '../../types.js';

export default function AbcAnalysis() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [abcData, setAbcData] = useState<AbcItem[]>([]);
  const [totalInvestasi, setTotalInvestasi] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Date selectors (defaulting to current month/year target)
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

  const loadAbcAnalysis = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.get(`/obat/abc?bulan=${selectedMonth}&tahun=${selectedYear}`);
      
      if (res.data && res.data.items) {
        setAbcData(res.data.items);
        setTotalInvestasi(res.data.total_investasi);
      } else {
        setAbcData([]);
        setTotalInvestasi(0);
      }
    } catch (err: any) {
      console.error(err);
      setFeedback('Gagal mendownload data analisis ABC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAbcAnalysis();
  }, [selectedMonth, selectedYear]);

  // Counting classes
  const classA = abcData.filter(item => item.klasifikasi === 'A');
  const classB = abcData.filter(item => item.klasifikasi === 'B');
  const classC = abcData.filter(item => item.klasifikasi === 'C');

  const classASpend = classA.reduce((sum, item) => sum + item.total_nilai, 0);
  const classBSpend = classB.reduce((sum, item) => sum + item.total_nilai, 0);
  const classCSpend = classC.reduce((sum, item) => sum + item.total_nilai, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            <span>Analisis Klasifikasi Inventori ABC (Drug Spend)</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Ukur efisiensi anggaran pengeluaran obat Klinik Puri Medika berdasarkan Pareto Value-Driven Indexing.
          </p>
        </div>

        {/* Month Year Selector */}
        <div className="flex items-center space-x-2 bg-white px-4 py-2 border border-slate-100/80 rounded-2xl shadow-sm">
          <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
          <select 
            id="abc-month-select"
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
            id="abc-year-select"
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
      </motion.div>

      {feedback && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          id="abc-error-alert" 
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center space-x-2 text-sm font-semibold"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <span>{feedback}</span>
        </motion.div>
      )}

      {/* Methodological Explanation card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 shadow-sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600 flex-shrink-0" />
            <span className="font-bold text-slate-800">Panduan Pengendalian Stok Metode ABC:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden transition-all">
              <span className="font-extrabold text-emerald-700 block text-xs">Kelas A (≥70% nilai)</span>
              <p className="mt-1 text-slate-600 text-xs text-justify">Prioritas utama monitoring & kontrol ketat.</p>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500"></div>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden transition-all">
              <span className="font-extrabold text-amber-700 block text-xs">Kelas B (70-90%)</span>
              <p className="mt-1 text-slate-600 text-xs text-justify">Monitoring reguler.</p>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-amber-500"></div>
            </div>
            <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 border border-slate-100 shadow-sm relative overflow-hidden transition-all">
              <span className="font-extrabold text-slate-700 block text-xs">Kelas C (&lt;90%)</span>
              <p className="mt-1 text-slate-600 text-xs text-justify">Monitoring rutin.</p>
              <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-500"></div>
            </div>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl border border-slate-250 p-24 text-center"
        >
          <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
          <span>Meganalisis pengeluaran obat pasca Pareto...</span>
        </motion.div>
      ) : abcData.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-150"
        >
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <p className="font-bold">Tidak ada jurnal log konsumsi.</p>
          <p className="text-xs text-slate-400 mt-1">
            Harap pastikan petugas telah mengisikan volume konsumsi obat bulanan untuk periode {months.find(m => m.value === selectedMonth)?.name} {selectedYear} di Modul Farmasi.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          
          {/* Investment value split overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* KPI: Total drug spend */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.16 }}
               whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.1)' }}
               className="bg-slate-900 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden"
            >
              <span className="text-[14px] font-extrabold text-slate-400 uppercase tracking-widest block">Nilai Total Pengeluaran Obat</span>
              <h3 className="text-2xl font-black font-mono block mt-2">
                Rp {totalInvestasi.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
              </h3>
              <p className="text-[14px] text-amber-400 font-medium mt-2 font-mono">Untuk seluruh obat yang digunakan</p>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-16 h-16"/>
              </div>
            </motion.div>

            {/* Class A summary */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.24 }}
               whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
               className="bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden transition-all"
            >
              <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider block">Kelompok A (80%)</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 font-mono mt-2">
                {classA.length} <span className="text-[14px] font-semibold text-slate-400">Obat</span>
              </h3>
              <p className="text-[14px] font-bold text-slate-600 mt-2">
                Anggaran: Rp {classASpend.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ({totalInvestasi > 0 ? Math.round((classASpend/totalInvestasi)*100) : 0}%)
              </p>
            </motion.div>

            {/* Class B summary */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.32 }}
               whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
               className="bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden transition-all"
            >
              <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider block">Kelompok B (15%)</span>
              <h3 className="text-2xl font-extrabold text-amber-500 font-mono mt-2">
                {classB.length} <span className="text-[14px] font-semibold text-slate-400">Obat</span>
              </h3>
              <p className="text-[14px] font-bold text-slate-600 mt-2">
                Anggaran: Rp {classBSpend.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ({totalInvestasi > 0 ? Math.round((classBSpend/totalInvestasi)*100) : 0}%)
              </p>
            </motion.div>

            {/* Class C summary */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.4, delay: 0.4 }}
               whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.04)' }}
               className="bg-white/70 backdrop-blur-md rounded-3xl p-5 border border-slate-100 shadow-sm relative overflow-hidden transition-all"
            >
              <span className="text-[14px] font-bold text-slate-500 uppercase tracking-wider block">Kelompok C (5%)</span>
              <h3 className="text-2xl font-extrabold text-slate-500 font-mono mt-2">
                {classC.length} <span className="text-[14px] font-semibold text-slate-400">Obat</span>
              </h3>
              <p className="text-[14px] font-bold text-slate-600 mt-2">
                Anggaran: Rp {classCSpend.toLocaleString('id-ID', { maximumFractionDigits: 0 })} ({totalInvestasi > 0 ? Math.round((classCSpend/totalInvestasi)*100) : 0}%)
              </p>
            </motion.div>
          </div>

          {/* Pareto Ranked Items List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.48 }}
            className="bg-white rounded-2xl border border-slate-100/80 shadow-sm overflow-hidden"
          >
            <div className="bg-slate-50/50 px-6 py-4.5 border-b border-slate-100/70">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Tabel Urutan Nilai Konsumsi (Pareto Decending)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100/70 text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Rank</th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400">Kode & Nama Obat</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Pemakaian</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Harga Satuan</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Total Nilai (Spend)</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Kontribusi</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold uppercase tracking-widest text-slate-400">Kumulatif %</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Kelompok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70 text-slate-700 text-xs font-semibold">
                  {abcData.map((item, index) => (
                    <tr key={item.obat_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-slate-400">
                        #{index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-mono text-xs font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                            {item.kode_obat}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1.5 text-xs">{item.nama_obat}</h4>
                          <p className="text-xs text-slate-400 font-medium mt-1 uppercase">{item.golongan}</p>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-xs text-slate-800">
                        {item.pemakaian.toLocaleString('id-ID')}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-xs text-slate-500">
                        Rp {item.harga_satuan.toLocaleString('id-ID')}
                      </td>

                      {/* Spend calculation */}
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-extrabold text-xs text-slate-900">
                        Rp {item.total_nilai.toLocaleString('id-ID')}
                      </td>

                      {/* Contribution % */}
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-xs text-slate-500">
                        {item.kontribusi_persen}%
                      </td>

                      {/* Cumulative % */}
                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                        {item.kumulatif_persen}%
                      </td>

                      {/* ABC class representation tag */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center h-7 w-7 text-xs font-black rounded-lg ${
                          item.klasifikasi === 'A' ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300' :
                          item.klasifikasi === 'B' ? 'bg-amber-100 text-amber-800 border border-amber-250' :
                          'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {item.klasifikasi}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
