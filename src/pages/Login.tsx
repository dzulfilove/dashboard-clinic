import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, Info, Key, ShieldCheck } from 'lucide-react';
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
  const [, setDebugOtp] = useState<string | null>(null);
  const [, setEmailPreviewUrl] = useState<string | null>(null);
  
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
      setSuccessMessage(response.data.message || 'Kode OTP telah berhasil diperbarui!');
      setStep('OTP');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Gagal mengirim OTP. Pastikan email terdaftar di database klinik.'
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

  return (
    <div 
      id="login-container" 
      className="relative min-h-screen bg-[#F8F9FF] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans select-none"
    >
      {/* Background Architectural Inset Tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#DCE6F5]/40 via-transparent to-[#F8F9FF] pointer-events-none" />

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

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center text-center">
        {/* Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          className="mb-6 flex flex-col items-center"
        >
          <div className="h-16 w-16 bg-white p-2.5 rounded-2xl shadow-[0_6px_24px_rgba(33,49,69,0.08)] border border-[#E5EEFF] flex items-center justify-center mb-3">
            <Logo size={44} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B1C30] tracking-tight font-display">
            Klinik Puri Medika<span className="text-[#FF8574]">.</span>
          </h1>
          <p className="text-xs text-[#516070] font-medium tracking-normal mt-1">
            Sistem Informasi &amp; Manajemen Pelayanan Terpadu
          </p>
        </motion.div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Slate & Ice Card (.si-card) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1], delay: 0.05 }}
          className="bg-white py-8 px-6 sm:px-9 rounded-[24px] shadow-[0_12px_36px_rgba(33,49,69,0.08)] border border-[#E5EEFF]"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-[#FEF2F2] border border-[#EF4444]/30 text-[#B91C1C] p-4 rounded-xl flex items-start space-x-2.5 text-xs leading-relaxed"
            >
              <AlertCircle className="h-4.5 w-4.5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 bg-[#ECFDF5] border border-[#10B981]/30 text-[#047857] p-4 rounded-xl flex items-start space-x-2.5 text-xs leading-relaxed"
            >
              <Info className="h-4.5 w-4.5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Kode OTP Dikirim</span>
                <span className="text-[#0B1C30]/80 font-medium leading-normal">{successMessage}</span>
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {step === 'EMAIL' ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
                onSubmit={handleSendOtp}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="email" className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                      Alamat Email Petugas
                    </label>
                    <span className="caption text-[11px] text-[#74777C]">Wajib</span>
                  </div>
                  <p className="text-xs text-[#516070] mb-3 font-normal leading-relaxed">
                    Masukkan email terdaftar untuk menerima 6-digit kode OTP autentikasi.
                  </p>
                  
                  <div className="relative rounded-xl group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="h-4.5 w-4.5 text-[#74777C] group-focus-within:text-[#213145] transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10.5 block w-full px-4 py-2.5 bg-[#EFF4FF] hover:bg-[#E5EEFF] focus:bg-white rounded-xl text-[#0B1C30] border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] focus:outline-none focus:ring-3 focus:ring-[#CCDCEF] text-xs font-semibold transition-all placeholder-[#74777C]"
                      placeholder="contoh: dzulfivector@gmail.com"
                      style={{ minHeight: '44px' }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="otp-send-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full si-btn si-btn--primary text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{ 
                      minHeight: '44px',
                      background: '#213145',
                      color: '#ffffff'
                    }}
                  >
                    <span>{loading ? 'Mengirim Kode...' : 'Kirim Kode OTP'}</span>
                    {!loading && <ArrowRight className="h-4 w-4 text-[#CCDCEF]" />}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
                onSubmit={handleVerifyOtp}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="otp" className="overline text-[11px] font-bold tracking-wider text-[#44474C] uppercase">
                      Kode Verifikasi OTP
                    </label>
                    <span className="caption text-[11px] text-[#FF8574] font-semibold">6 Digit</span>
                  </div>
                  <p className="text-xs text-[#516070] mb-3 leading-relaxed">
                    Masukkan 6-digit kode yang dikirim ke <span className="font-semibold text-[#0B1C30]">{email}</span>.
                  </p>
                  
                  <div className="relative rounded-xl group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Key className="h-4.5 w-4.5 text-[#74777C] group-focus-within:text-[#213145] transition-colors" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="pl-10.5 block w-full px-4 py-2.5 bg-[#EFF4FF] hover:bg-[#E5EEFF] focus:bg-white rounded-xl text-[#0B1C30] border border-transparent hover:border-[#D3E4FE] focus:border-[#213145] focus:outline-none focus:ring-3 focus:ring-[#CCDCEF] text-base font-mono font-bold tracking-[0.3em] text-center transition-all placeholder-[#74777C]"
                      placeholder="••••••"
                      style={{ minHeight: '44px' }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    id="otp-verify-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full si-btn si-btn--primary text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                    style={{ 
                      minHeight: '44px',
                      background: '#213145',
                      color: '#ffffff'
                    }}
                  >
                    <span>{loading ? 'Memverifikasi...' : 'Verifikasi & Masuk Klinik'}</span>
                    {!loading && <ArrowRight className="h-4 w-4 text-[#CCDCEF]" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToEmail}
                    className="w-full si-btn si-btn--ghost text-xs font-semibold text-[#516070] hover:text-[#0B1C30] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ minHeight: '38px' }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Ganti Alamat Email</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-4 border-t border-[#E5EEFF] flex items-center justify-center gap-1.5 text-[11px] text-[#74777C]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
            <span>Klinik Puri Medika • Akses Terautentikasi</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
});
