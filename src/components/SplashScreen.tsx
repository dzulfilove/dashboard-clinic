import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import logoImg from '../../assets/logo.png';
import { CheckCircle2, ShieldCheck, Sparkles, Activity, Heart, Stethoscope, Plus } from 'lucide-react';

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

  const userName = user?.nama_lengkap || user?.nama || user?.email?.split('@')[0] || 'Pengguna';
  const roleTitle = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Petugas Klinik';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0f5144] via-[#0d3d34] to-[#07241e] text-white overflow-hidden select-none font-sans"
    >
      {/* --- Top-Left Organic Curved Blob (Reference Style) --- */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-teal-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-white/10 to-transparent rounded-br-[160px] pointer-events-none backdrop-blur-3xl border-b border-r border-white/10" />

      {/* --- Bottom-Right Ambient Blob --- */}
      <div className="absolute -bottom-28 -right-28 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* --- Floating Translucent Medical/Clinic Icons (Reference Style) --- */}
      <Activity className="absolute top-[18%] left-[12%] w-7 h-7 text-teal-200/20 -rotate-12 animate-pulse pointer-events-none" />
      <Heart className="absolute top-[28%] right-[14%] w-8 h-8 text-emerald-200/20 rotate-12 animate-bounce pointer-events-none" style={{ animationDuration: '3.5s' }} />
      <Plus className="absolute bottom-[28%] left-[16%] w-6 h-6 text-teal-100/20 rotate-45 pointer-events-none" />
      <Stethoscope className="absolute bottom-[18%] right-[15%] w-8 h-8 text-teal-200/20 -rotate-12 pointer-events-none" />

      {/* --- Subtle Radial Mesh --- */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.9) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* --- Main Content Area with Staggered Fade-Up --- */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        
        {/* Logo Container with Fade-Up Animation */}
        <motion.div
          initial={{ opacity: 0.8, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 flex flex-col items-center"
        >
          {/* Subtle Ambient Logo Glow */}
          <motion.div
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.25, 0.5, 0.25],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-4 rounded-full bg-teal-300 blur-2xl opacity-30"
          />

          {/* Logo White Square Container Box */}
          <div className="relative bg-white w-28 h-28 sm:w-32 sm:h-32 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/90 flex items-center justify-center">
            <img 
              src={logoImg} 
              alt="Logo Klinik Puri Medika" 
              width={128}
              height={128}
              // @ts-ignore
              fetchPriority="high"
              className="w-full h-full object-contain drop-shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/logo.png')) {
                  target.src = '/logo.png';
                }
              }}
            />
          </div>

          {mode === 'login' && (
            <motion.div
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
              className="absolute -bottom-2 -right-2 bg-emerald-400 text-slate-900 p-2 rounded-full shadow-lg border-2 border-emerald-900"
            >
              <CheckCircle2 className="w-5 h-5 font-bold" />
            </motion.div>
          )}
        </motion.div>

        {/* Title & Description with Immediate Paint for Optimal LCP */}
        {mode === 'initial' ? (
          <div
            className="space-y-1.5 mb-8 anim-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1 drop-shadow-md font-display">
              Klinik Puri Medika<span className="text-teal-300">.</span>
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-200/80">
              Sistem Informasi Klinik & Pelayanan
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 1, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-2 mb-8"
          >
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-300/15 border border-teal-300/30 text-teal-200 text-xs font-bold tracking-wider uppercase mb-1 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Autentikasi Berhasil
            </div>
            <h2 className="text-2xl font-black text-white drop-shadow-md">
              Selamat Datang Kembali!
            </h2>
            <div className="pt-2">
              <p className="text-lg font-bold text-teal-200">{userName}</p>
              <p className="text-xs font-medium text-emerald-100/80 mt-0.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-300" /> Mode Akses: <span className="text-white font-bold">{roleTitle}</span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Progress Bar & Status with Fade-Up Animation */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full space-y-3"
        >
          <div className="w-full bg-black/25 rounded-full h-2.5 p-0.5 overflow-hidden border border-white/10 shadow-inner relative backdrop-blur-sm">
            <motion.div
              className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-100 h-full rounded-full shadow-md"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-teal-100/80 font-medium px-1">
            <span className="truncate">
              {mode === 'initial' ? statusText : 'Mengarahkan ke Dashboard...'}
            </span>
            <span className="font-mono text-teal-200 font-bold">{progress}%</span>
          </div>
        </motion.div>

      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute bottom-6 text-center text-xs text-teal-200/60 font-medium tracking-wider uppercase"
      >
        Klinik Health Services • Version 2.0
      </motion.div>
    </motion.div>
  );
}

