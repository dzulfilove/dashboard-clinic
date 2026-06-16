import React, { useState, useEffect } from 'react';
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

  // Connection tester variables
  const [testHost, setTestHost] = useState('');
  const [testUser, setTestUser] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testDatabase, setTestDatabase] = useState('');
  const [testPort, setTestPort] = useState('3306');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Migration states
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; message: string } | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDbStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/db/status');
      const status: DbStatus = res.data;
      setDbStatus(status);

      // Pre-fill fields for connection testing
      if (status) {
        setTestHost(status.host || '');
        setTestUser(status.user || '');
        setTestDatabase(status.database || '');
        setTestPort(String(status.port || 3306));
      }
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
    if (!testHost || !testUser || !testDatabase) {
      setTestResult({ success: false, message: 'Harap lengkapi isian Host, User, dan Nama Database.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.post('/db/test-connection', {
        host: testHost,
        user: testUser,
        password: testPassword,
        database: testDatabase,
        port: Number(testPort)
      });
      setTestResult(res.data);
    } catch (err: any) {
      setTestResult({ success: false, message: 'Koneksi gagal: ' + (err.response?.data?.message || err.message) });
    } finally {
      setTesting(false);
    }
  };

  const handleRunMigrations = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menjalankan migrasi tabel? Pastikan database baru Anda kosong.')) {
      return;
    }

    setMigrating(true);
    setMigrationResult(null);

    try {
      const res = await api.post('/db/run-migrations');
      setMigrationResult(res.data);
      // Refresh database status to see if it changed
      fetchDbStatus();
    } catch (err: any) {
      setMigrationResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Database className="h-6 w-6 text-teal-600" />
          <span>Pengaturan & Diagnostik Sinkronisasi Database VPS</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
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
        <div className="bg-white p-6 border border-slate-150 rounded-2xl shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-100 pb-3">
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
                  dbStatus.status === 'ONLINE' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' :
                  dbStatus.status === 'VIRTUAL' ? 'bg-amber-55 text-amber-805 text-amber-800 border-amber-200' :
                  'bg-rose-50 border-rose-150 text-rose-800'
                }`}>
                  <Network className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-xxs uppercase tracking-wider font-extrabold">STATUS ENGINE</span>
                  <p className="text-lg font-black font-mono mt-0.5">{dbStatus.status}</p>
                </div>

                <div className="space-y-2.5 text-xs font-semibold">
                  <div className="flex justify-between border-b border-slate-50 py-2">
                    <span className="text-slate-500">Mode Database</span>
                    <span className="text-slate-900 uppercase font-bold font-mono">
                      {dbStatus.isVirtual ? 'Virtual SQL (Lokal)' : 'VPS MySQL (Aktif)'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-2">
                    <span className="text-slate-500">Host VPS</span>
                    <span className="text-slate-900 font-mono">{dbStatus.host || 'localhost'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-2">
                    <span className="text-slate-500">Nama Database</span>
                    <span className="text-slate-900 font-mono">{dbStatus.database || 'mem_repo'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-2">
                    <span className="text-slate-500">Port</span>
                    <span className="text-slate-900 font-mono">{dbStatus.port || '3306'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 py-2">
                    <span className="text-slate-500">User Login</span>
                    <span className="text-slate-900 font-mono">{dbStatus.user || 'root'}</span>
                  </div>
                </div>

                {dbStatus.error && (
                  <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xxs font-mono leading-relaxed rounded-xl break-words">
                    <strong>Log Diagnostik:</strong> {dbStatus.error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <button
            id="refresh-db-status-btn"
            onClick={fetchDbStatus}
            className="w-full mt-4 flex items-center justify-center space-x-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <RefreshCw className="h-4 w-4" />
            <span>Pindai Ulang Port</span>
          </button>
        </div>

        {/* Right: VPS MySQL Connection tester & Live Database schema Migration builder */}
        <div className="bg-white p-6 border border-slate-150 rounded-2xl shadow-sm lg:col-span-2 space-y-6">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm tracking-wider uppercase border-b border-slate-100 pb-3">
              Integrasi VPS MySQL Baru
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Konfigurasikan kredensial VPS MySQL Anda untuk memindahkan data dari Database Virtual ke VPS permanen Anda.
            </p>
          </div>

          {/* Guide steps to configure VPS */}
          <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-4 text-xs leading-relaxed text-indigo-900">
            <span className="font-bold block mb-1">Langkah Penyambungan VPS MySQL Mandiri:</span>
            <ul className="list-decimal pl-4 space-y-1">
              <li>Masukkan kredensial VPS MySQL Anda pada isian di bawah dan klik <strong>Uji Koneksi</strong>.</li>
              <li>Untuk menjadikannya permanen, atur nilai variabel ini di file <strong className="font-mono">.env</strong> Anda:
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg mt-1 font-mono text-xxs leading-relaxed">
                  DB_HOST="your_vps_ip"<br />
                  DB_USER="your_mysql_username"<br />
                  DB_PASSWORD="your_mysql_password"<br />
                  DB_DATABASE="klinik_puri_medika"<br />
                  DB_PORT=3306
                </div>
              </li>
              <li>Nyalakan ulang server, lalu klik tombol <strong>Jalankan Migrasi Database</strong> untuk membentuk database beserta isinya secara otomatis!</li>
            </ul>
          </div>

          {/* Database testing Form */}
          <form onSubmit={handleTestConnection} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label htmlFor="vh-host" className="block text-xxs font-extrabold uppercase text-slate-500 tracking-wider">Host VPS (IP / Domain)</label>
              <input
                id="vh-host"
                type="text"
                required
                placeholder="ex: 103.111.222.12"
                value={testHost}
                onChange={(e) => setTestHost(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="vh-port" className="block text-xxs font-extrabold uppercase text-slate-500 tracking-wider">Port</label>
              <input
                id="vh-port"
                type="text"
                required
                placeholder="3306"
                value={testPort}
                onChange={(e) => setTestPort(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="vh-user" className="block text-xxs font-extrabold uppercase text-slate-500 tracking-wider">User MySQL</label>
              <input
                id="vh-user"
                type="text"
                required
                placeholder="ex: root"
                value={testUser}
                onChange={(e) => setTestUser(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="vh-pass" className="block text-xxs font-extrabold uppercase text-slate-500 tracking-wider leading-relaxed">Password</label>
              <input
                id="vh-pass"
                type="password"
                placeholder="Kata sandi VPS MySQL"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12">
              <label htmlFor="vh-db" className="block text-xxs font-extrabold uppercase text-slate-500 tracking-wider">Nama Database (Telah Dibuat Di VPS)</label>
              <input
                id="vh-db"
                type="text"
                required
                placeholder="ex: klinik_puri_medika"
                value={testDatabase}
                onChange={(e) => setTestDatabase(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-12 flex justify-start pt-2">
              <button
                id="test-connection-btn"
                type="submit"
                disabled={testing}
                className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                <Plug className="h-4 w-4" />
                <span>{testing ? 'Menguji...' : 'Uji Koneksi VPS'}</span>
              </button>
            </div>
          </form>

          {testResult && (
            <div id="test-connection-result" className={`p-4 rounded-xl border text-xs leading-relaxed font-semibold flex items-start space-x-2 ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                : 'bg-rose-50 border-rose-150 text-rose-800'
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
          <div className="border-t border-slate-100 pt-6 space-y-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Pemicu Migrasi Skema Database</h4>
              <p className="text-xs text-slate-500 mt-1">
                Jalankan migrasi DDL schema otomatis untuk membentuk tabel, indeks, relasi serta pre-seed catalog Klinik Puri Medika di VPS MySQL Anda yang aktif.
              </p>
            </div>

            <button
              id="run-migrations-btn"
              onClick={handleRunMigrations}
              disabled={dbStatus?.status !== 'ONLINE' || migrating}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs py-3 px-5 rounded-xl cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <Terminal className="h-4.5 w-4.5" />
              <span>{migrating ? 'Menjalankan Migrasi...' : 'Jalankan Migrasi Database'}</span>
            </button>

            {migrationResult && (
              <div id="migration-result-alert" className={`p-4 rounded-xl border text-xs leading-relaxed font-semibold flex items-start space-x-2 ${
                migrationResult.success 
                  ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                  : 'bg-rose-50 border-rose-150 text-rose-800'
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
