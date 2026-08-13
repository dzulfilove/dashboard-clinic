import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Activity, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Info, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../services/api.js';
import Logo from '../components/Logo.js';
import SplashScreen from '../components/SplashScreen.js';

export default React.memo(function Login() {
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

  // Splash state for post-login
  const [loginSuccessData, setLoginSuccessData] = useState<{ token: string; user: any } | null>(null);

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
      // Trigger Login Splash Screen before saving auth
      setLoginSuccessData({ token, user });
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Kode OTP salah atau telah kedaluwarsa. Silakan periksa kembali.'
      );
      setLoading(false);
    }
  };

  const handleCompleteLoginSplash = () => {
    if (loginSuccessData) {
      setAuth(loginSuccessData.token, loginSuccessData.user);
      navigate(from, { replace: true });
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
    <div id="login-container" className="relative min-h-screen bg-gradient-to-tr from-[#98aab2] via-[#b5c6cc] to-[#ccd7dc] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans">
      {/* Post-Login Splash Screen */}
      <AnimatePresence>
        {loginSuccessData && (
          <SplashScreen
            mode="login"
            user={loginSuccessData.user}
            onComplete={handleCompleteLoginSplash}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Background Glass Blows - Optimized to transform-gpu static circles to prevent continuous repaints */}
      <div className="absolute top-[-5%] left-[-5%] w-[60%] h-[60%] bg-teal-300/20 rounded-full blur-[80px] pointer-events-none transform-gpu" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[60%] h-[60%] bg-sky-300/20 rounded-full blur-[80px] pointer-events-none transform-gpu" />
      <div className="absolute top-[40%] right-[10%] w-[25%] h-[25%] bg-sky-200/15 rounded-full blur-[60px] pointer-events-none transform-gpu" />

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center text-center">
        {/* Animated Brand Header inside Glass Container */}
        <motion.div 
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-4 inline-flex items-center justify-center bg-white/30 backdrop-blur-xl px-7 py-4 border border-white/50 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.8),0_15px_35px_-10px_rgba(15,23,42,0.12)] rounded-3xl transform-gpu"
        >
          <Logo size={64} showText={true} />
        </motion.div>
      </div>

      <div className="relative z-10 mt-2 w-full max-w-md mx-auto">
        {/* Glassmorphic Card Container */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white/20 backdrop-blur-lg py-8 px-6 border border-white/40 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.6),0_20px_50px_-12px_rgba(15,23,42,0.15)] rounded-3xl sm:px-10 transform-gpu"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-rose-500/10 border border-rose-500/30 backdrop-blur-md text-rose-950 p-4 rounded-xl flex items-start space-x-2.5 text-sm leading-relaxed duration-200"
            >
              <AlertCircle className="h-5 w-5 text-rose-700 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md text-emerald-950 p-4 rounded-xl flex items-start space-x-2.5 text-sm leading-relaxed duration-200"
            >
              <Info className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-1">Minta OTP Berhasil</span>
                <span className="text-xs text-slate-800 leading-normal">{successMessage}</span>
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
                  <label htmlFor="email" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 ml-0.5">
                    Alamat Email Petugas
                  </label>
                  <p className="text-xs text-slate-700 mb-3 font-semibold leading-relaxed">
                    Masukkan email Anda yang terdaftar pada tabel Baserow untuk mendapatkan kode OTP login.
                  </p>
                  <div className="relative rounded-xl shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 block w-full px-4 py-3 bg-white/35 backdrop-blur-md rounded-xl text-slate-900 border border-white/40 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-600/50 text-sm transition-all placeholder-slate-500 font-semibold"
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
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-teal-600/30 rounded-xl shadow-lg shadow-teal-700/10 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <span>{loading ? 'Menghubungkan...' : 'Kirim Kode OTP'}</span>
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
                  <label htmlFor="otp" className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 ml-0.5">
                    Masukkan Kode OTP
                  </label>
                  <p className="text-xs text-slate-700 mb-3 font-semibold leading-relaxed">
                    Silakan salin kode OTP 6-Digit yang dikirimkan ke email <span className="text-teal-850 font-bold font-mono">{email}</span> (juga tercatat di kolom <strong>OTP</strong> pada database Baserow Anda).
                  </p>
                  <div className="relative rounded-xl shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Key className="h-5 w-5 text-slate-500 group-focus-within:text-teal-700 transition-colors" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="pl-11 block w-full px-4 py-3 bg-white/35 backdrop-blur-md rounded-xl text-slate-900 border border-white/40 focus:outline-none focus:ring-4 focus:ring-teal-500/15 focus:border-teal-600/50 text-sm font-bold tracking-widest font-mono text-center transition-all placeholder-slate-500"
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
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-teal-600/30 rounded-xl shadow-lg shadow-teal-700/10 text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:opacity-50 transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    <span>{loading ? 'Memverifikasi...' : 'Verifikasi & Masuk Klinik'}</span>
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </motion.button>

                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="w-full py-2 px-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-650 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none focus:outline-none"
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
});
