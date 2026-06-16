import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Activity, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Info, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const from = location.state?.from?.pathname || '/';

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Harap masukkan alamat email Anda.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post('/auth/send-otp', { email });
      setDebugOtp(response.data.debugOtp || null);
      setEmailPreviewUrl(response.data.emailPreviewUrl || null);
      setSuccessMessage(response.data.message || 'Kode OTP telah berhasil diperbarui di database Baserow!');
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Gagal mengirim OTP. Pastikan email terdaftar di database Baserow.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      setError('Harap masukkan kode OTP yang dikirim.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      const { token, user } = response.data;
      setAuth(token, user);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Kode OTP salah atau telah kedaluwarsa. Silakan periksa kembali.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('EMAIL');
    setOtp('');
    setDebugOtp(null);
    setEmailPreviewUrl(null);
    setError(null);
    setSuccessMessage(null);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        when: 'beforeChildren',
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <div id="login-container" className="relative min-h-screen bg-slate-50/50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* Dynamic Background Glass Blows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[40%] right-[10%] w-[25%] h-[25%] bg-sky-400/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Animated Brand Header */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex justify-center"
        >
          <div className="flex items-center space-x-3 bg-teal-800/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl shadow-lg border border-teal-600/30">
            <Activity className="h-7 w-7 text-teal-300 animate-pulse stroke-[2.5]" />
            <span className="font-extrabold text-xl tracking-tight font-display">Klinik Puri Medika</span>
          </div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight font-display"
        >
          Sistem Informasi Klinik
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="mt-2 text-center text-sm text-slate-500 font-medium"
        >
          Otentikasi Aman OTP Baserow (Kolom OTP 2)
        </motion.p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Glassmorphic Card Container */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/70 backdrop-blur-xl py-8 px-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] rounded-3xl border border-white/50 sm:px-10"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-rose-50/80 backdrop-blur-sm border border-rose-200/60 text-rose-800 p-4 rounded-xl flex items-start space-x-2.5 text-sm leading-relaxed duration-200"
            >
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-emerald-50/80 backdrop-blur-sm border border-emerald-250/50 text-emerald-800 p-4 rounded-xl flex items-start space-x-2.5 text-sm leading-relaxed duration-200"
            >
              <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-1">Minta OTP Berhasil</span>
                <span className="text-xs text-slate-600">{successMessage}</span>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 'EMAIL' ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
                onSubmit={handleSendOtp}
              >
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-0.5">
                    Alamat Email Petugas
                  </label>
                  <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">
                    Masukkan email Anda yang terdaftar pada tabel Baserow untuk mendapatkan kode OTP login.
                  </p>
                  <div className="relative rounded-xl shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 block w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 text-sm transition-all placeholder-slate-400 font-medium"
                      placeholder="contoh: dzulfivector@gmail.com"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <motion.button
                    id="otp-send-btn"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-teal-600/30 rounded-xl shadow-lg shadow-teal-700/10 text-sm font-bold text-white bg-teal-700 hover:bg-teal-850 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <span>{loading ? 'Menghubungkan...' : 'Kirim Kode OTP 2'}</span>
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </motion.button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
                onSubmit={handleVerifyOtp}
              >


                <div>
                  <label htmlFor="otp" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-0.5">
                    Masukkan Kode OTP 2
                  </label>
                  <p className="text-xs text-slate-500 mb-3 font-medium leading-relaxed">
                    Silakan salin kode OTP 6-Digit yang dikirimkan ke email <span className="text-teal-700 font-bold font-mono">{email}</span> (juga tercatat di kolom <strong>OTP 2</strong> pada database Baserow Anda).
                  </p>
                  <div className="relative rounded-xl shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="pl-11 block w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500 text-sm font-bold tracking-widest font-mono text-center transition-all placeholder-slate-450"
                      placeholder="******"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <motion.button
                    id="otp-verify-btn"
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-teal-600/30 rounded-xl shadow-lg shadow-teal-700/10 text-sm font-bold text-white bg-teal-700 hover:bg-teal-850 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <span>{loading ? 'Memverifikasi...' : 'Verifikasi & Masuk Klinik'}</span>
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="w-full py-2 px-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-850 transition-colors cursor-pointer bg-transparent border-none focus:outline-none"
                    style={{ minHeight: '38px' }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Ganti Alamat Email</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
