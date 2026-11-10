import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import logoImg from '../../assets/logo.png';
import logoSvg from '../../assets/logo.svg';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  mode: 'initial' | 'login';
  user?: {
    nama_lengkap?: string;
    nama?: string;
    role?: string;
    email?: string;
  } | null;
  onComplete: () => void;
}

export default function SplashScreen({ mode, user, onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Menyiapkan sistem...');

  useEffect(() => {
    if (mode === 'initial') {
      const texts = [
        'Menyiapkan sistem...',
        'Memuat modul pelayanan klinik...',
        'Sinkronisasi data rekam medis...',
        'Sistem siap!'
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep += 1;
        if (currentStep < texts.length) {
          setStatusText(texts[currentStep]);
        }
      }, 450);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 4;
        });
      }, 65);

      const timeout = setTimeout(() => {
        onComplete();
      }, 2100);

      return () => {
        clearInterval(interval);
        clearInterval(progressInterval);
        clearTimeout(timeout);
      };
    } else {
      // Login mode splash
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 5;
        });
      }, 55);

      const timeout = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(timeout);
      };
    }
  }, [mode, onComplete]);

  const userName = user?.nama_lengkap || user?.nama || user?.email?.split('@')[0] || 'Petugas';
  const roleTitle = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Petugas Klinik';

  return (
    <motion.div
      initial={{ opacity: mode === 'initial' ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#213145] text-white overflow-hidden select-none font-sans"
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#CCDCEF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FF8574]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        
        {/* Logo Container */}
        <motion.div
          initial={{ opacity: 0.8, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative mb-6 flex flex-col items-center"
        >
          {/* Logo White Square Container Box */}
          <div className="relative bg-white w-24 h-24 sm:w-28 sm:h-28 p-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/80 flex items-center justify-center">
            <img 
              src={logoSvg || logoImg} 
              alt="Logo Klinik Puri Medika" 
              width={112}
              height={112}
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = logoImg;
              }}
            />
          </div>

          {mode === 'login' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, duration: 0.25, ease: 'easeOut' }}
              className="absolute -bottom-2 -right-2 bg-[#10B981] text-white p-1.5 rounded-full shadow-lg border-2 border-[#213145]"
            >
              <CheckCircle2 className="w-4 h-4 font-bold" />
            </motion.div>
          )}
        </motion.div>

        {/* Title & Description */}
        {mode === 'initial' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="space-y-1.5 mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1 font-display">
              Klinik Puri Medika<span className="text-[#FF8574]">.</span>
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#B8C8DB]">
              Sistem Informasi Klinik &amp; Pelayanan
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 1, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-2 mb-8"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CCDCEF]/15 border border-[#CCDCEF]/25 text-[#CCDCEF] text-xs font-bold tracking-wider uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FF8574]" /> Autentikasi Berhasil
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
              Selamat Datang Kembali!
            </h2>
            <div className="pt-1">
              <p className="text-base font-bold text-[#CCDCEF] font-display">{userName}</p>
              <p className="text-xs font-medium text-[#B8C8DB] mt-0.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Mode Akses: <span className="text-white font-mono font-semibold">{roleTitle}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Progress Bar & Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          className="w-full space-y-2.5"
        >
          <div className="w-full bg-white/10 rounded-full h-2 p-0.5 overflow-hidden border border-white/10 relative">
            <motion.div
              className="bg-[#CCDCEF] h-full rounded-full shadow-sm"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8C8DB] font-medium px-1">
            <span className="truncate">
              {mode === 'initial' ? statusText : 'Mengarahkan ke Dashboard...'}
            </span>
            <span className="font-mono text-[#CCDCEF] font-bold">{progress}%</span>
          </div>
        </motion.div>

      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="absolute bottom-6 text-center text-[11px] text-[#B8C8DB]/70 font-medium tracking-wider uppercase"
      >
        Klinik Puri Medika • Slate &amp; Ice v2.0
      </motion.div>
    </motion.div>
  );
}
