import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../store/authStore.js';
import { 
  Database,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Terminal,
  Save,
  Network,
  Info2,
  Plug,
  Info
} from 'lucide-react';
import api from '../../services/api.js';
import { DbStatus } from '../../types.js';

export default function DatabaseSettings() {
  const { user } = useAuthStore();
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Migration states
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cleanReset, setCleanReset] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/db/status');
      const status: DbStatus = res.data;
      setDbStatus(status);
    } catch (err) {
      console.error(err);
      setFeedback('Gagal menghubungi status database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post('/db/test-connection');
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ success: false, message: 'Koneksi gagal: ' + (err.response?.data?.message || err.message) });
    } finally {
      setTesting(false);
    }
  };

  const handleRunMigrations = async () => {
    const confirmMessage = cleanReset 
      ? 'PERINGATAN: Opsi reset bersih diaktifkan. Semua tabel Klinik Puri Medika lama di database Anda akan DIHAPUS dan dibuat ulang secara bersih. Apakah Anda yakin?'
      : 'Apakah Anda yakin ingin menjalankan migrasi tabel? Pastikan database baru Anda kosong.';

    Swal.fire({
      title: 'Jalankan Migrasi Database?',
      text: confirmMessage,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: cleanReset ? '#e11d48' : '#0d9488',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Jalankan!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setMigrating(true);
        setMigrationResult(null);

        try {
          const res = await api.post('/db/run-migrations', { cleanReset });
          setMigrationResult(res.data);
          // Refresh database status to see if it changed
          fetchDbStatus();
        } catch (err: any) {
          setMigrationResult({ success: false, message: err.response?.data?.message || err.message });
        } finally {
          setMigrating(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Database className="h-5 w-5 text-teal-600" />
          <span>Pengaturan & Diagnostik Sinkronisasi Database VPS</span>
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Konfigurasikan integrasi MySQL VPS eksternal, validasi status socket server, dan jalankan migrasi schema otomatis.
        </p>
      </div>

      {feedback && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-xl">
          {feedback}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Current Active DB Status diagnostic card */}
        <div 
          className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm lg:col-span-1 flex flex-col justify-between anim-fade-up"
        >
          <div className="space-y-6">
            <h3 className="font-semibold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-100/70 pb-3">
              Status Koneksi Saat Ini
            </h3>

            {loading ? (
              <div className="text-center py-6 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-teal-600" />
                <span>Mendeteksi status...</span>
              </div>
            ) : dbStatus ? (
              <div className="space-y-4">
                
                {/* Visual state monitor */}
                <div className={`p-4 rounded-2xl border text-center ${
                  dbStatus.status === 'ONLINE' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                  dbStatus.status === 'VIRTUAL' ? 'bg-amber-50 text-amber-800 border-amber-100' :
                  'bg-rose-50 border-rose-100 text-rose-800'
                }`}>
                  <Network className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-xs uppercase tracking-wider font-medium">STATUS ENGINE</span>
                  <p className="text-lg font-semibold font-mono mt-0.5">{dbStatus.status}</p>
                </div>

                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between border-b border-slate-100/50 py-2">
                    <span className="text-slate-500">Mode Database</span>
                    <span className="text-slate-900 uppercase font-bold font-mono">
                      {dbStatus.isVirtual ? 'Virtual SQL (Lokal)' : 'VPS MySQL (Aktif)'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 py-2">
                    <span className="text-slate-500">Host VPS</span>
                    <span className="text-slate-900 font-mono">{dbStatus.host || 'localhost'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 py-2">
                    <span className="text-slate-500">Nama Database</span>
                    <span className="text-slate-900 font-mono">{dbStatus.database || 'mem_repo'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 py-2">
                    <span className="text-slate-500">Port</span>
                    <span className="text-slate-900 font-mono">{dbStatus.port || '3306'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 py-2">
                    <span className="text-slate-500">User Login</span>
                    <span className="text-slate-900 font-mono">{dbStatus.user || 'root'}</span>
                  </div>
                </div>

                {dbStatus.error && (
                  <div className="p-3 bg-slate-50 border border-slate-100 text-slate-500 text-xs font-mono leading-relaxed rounded-xl break-words">
                    <strong>Log Diagnostik:</strong> {dbStatus.error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            id="refresh-db-status-btn"
            onClick={fetchDbStatus}
            className="w-full mt-4 flex items-center justify-center space-x-2 bg-white border border-slate-100 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer shadow-xs transition-all"
            style={{ minHeight: '44px' }}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Pindai Ulang Port</span>
          </button>
        </div>

        {/* Right: VPS MySQL Connection tester & Live Database schema Migration builder */}
        <div 
          className="bg-white p-6 border border-slate-100 rounded-2xl shadow-sm lg:col-span-2 space-y-6 anim-fade-up anim-delay-1"
        >
          <div>
            <h3 className="font-semibold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-100/70 pb-3">
              Sistem Integrasi MySQL VPS
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Semua parameter koneksi ditarik secara otomatis dari environment variable (<strong className="font-mono">.env</strong>) demi keamanan dan skalabilitas sistem. Pelajari status keselarasan di bawah ini.
            </p>
          </div>

          {/* Active Env Configuration Details Panel */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3.5 shadow-xs">
            <span className="text-xs font-bold text-slate-700 block border-b border-slate-100/70 pb-2">
              Konfigurasi Terbaca dari .env:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-500 block">Host VPS / IP:</span>
                <span className="text-slate-900 font-mono font-bold mt-0.5 block">
                  {dbStatus?.host ? dbStatus.host : '(Belum terdefinisi)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Port:</span>
                <span className="text-slate-900 font-mono font-bold mt-0.5 block">
                  {dbStatus?.port || '3306'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">User Database:</span>
                <span className="text-slate-900 font-mono font-bold mt-0.5 block">
                  {dbStatus?.user ? dbStatus.user : '(Belum terdefinisi)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Nama Database:</span>
                <span className="text-slate-900 font-mono font-bold mt-0.5 block">
                  {dbStatus?.database ? dbStatus.database : '(Belum terdefinisi)'}
                </span>
              </div>
            </div>
            
            <div className="pt-2 text-xs text-slate-400 border-t border-slate-100/70 leading-relaxed">
              * Keamanan Terjamin: Sandi database Anda diproses secara server-side dan tidak pernah dikirimkan atau dipaparkan ke sisi client/browser.
            </div>
          </div>

          {/* Database testing Controls */}
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Validasi Sambungan VPS</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Uji apakah socket server dapat terhubung ke target VPS MySQL Anda dengan aturan firewall dan kredensial saat ini.
              </p>
            </div>

            <form onSubmit={handleTestConnection}>
              <button
                id="test-connection-btn"
                type="submit"
                disabled={testing}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <Plug className="h-4 w-4" />
                <span>{testing ? 'Menguji Sambungan...' : 'Uji Koneksi VPS'}</span>
              </button>
            </form>
          </div>

          {testResult && (
            <div id="test-connection-result" className={`p-4 rounded-2xl border text-xs leading-relaxed font-semibold flex items-start space-x-2 shadow-xs transition-all ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* AUTOMATED MIGRATIONS PANEL AND BUTTON */}
          <div className="border-t border-slate-100/70 pt-6 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Pemicu Migrasi Skema Database</h4>
              <p className="text-xs text-slate-500 mt-1">
                Jalankan migrasi DDL schema otomatis untuk membentuk semua tabel, indeks, relasi serta pre-seed catalog Klinik Puri Medika di VPS MySQL Anda yang aktif.
              </p>
            </div>

            <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 text-xs shadow-xs">
              <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={cleanReset}
                  onChange={(e) => setCleanReset(e.target.checked)}
                  className="mt-0.5 rounded border-slate-200 text-teal-600 focus:ring-teal-500/20 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-800">Aktifkan Reset Bersih (Clean Reset)</span>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Centang opsi ini untuk menghapus otomatis semua tabel Klinik Puri Medika yang berkonflik jika Anda mengalami kegagalan migrasi "Foreign key constraint", atau jika Anda ingin membangun ulang database secara segar.
                  </p>
                </div>
              </label>
            </div>

            <button
              id="run-migrations-btn"
              onClick={handleRunMigrations}
              disabled={dbStatus?.status !== 'ONLINE' || migrating}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <Terminal className="h-4.5 w-4.5" />
              <span>{migrating ? 'Menjalankan Migrasi...' : 'Jalankan Migrasi Database'}</span>
            </button>

            {migrationResult && (
              <div id="migration-result-alert" className={`p-4 rounded-2xl border text-xs leading-relaxed font-semibold flex items-start space-x-2 shadow-xs transition-all ${
                migrationResult.success 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              }`}>
                {migrationResult.success ? (
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <span>{migrationResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
