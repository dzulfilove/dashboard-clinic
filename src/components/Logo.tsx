import React from 'react';
import logoImg from '../../assets/logo.png';

interface LogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textClassName?: string;
  variant?: 'image' | 'svg';
  orientation?: 'row' | 'col';
}

export default function Logo({ 
  className = '', 
  size = 64, 
  showText = false, 
  textClassName = '',
  variant = 'image',
  orientation = 'row'
}: LogoProps) {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;
  const isCol = orientation === 'col';

  return (
    <div className={`inline-flex items-center justify-center ${isCol ? 'flex-col text-center gap-2' : 'flex-row gap-2.5'} ${className}`}>
      {variant === 'image' ? (
        <img
          src={logoImg}
          alt="Logo Klinik Puri Medika"
          style={{ width: pixelSize, height: 'auto', maxHeight: pixelSize }}
          className="shrink-0 object-contain drop-shadow-md select-none"
          onError={(e) => {
            // Fallback to /logo.png or /assets/logo.png if import has issue
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 400 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 drop-shadow-md"
        >
          <defs>
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
            <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#134b7f" />
            </linearGradient>
            <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f5144" />
              <stop offset="100%" stopColor="#0a3d33" />
            </linearGradient>
          </defs>
          <rect x="180" y="115" width="62" height="110" rx="8" fill="url(#tealGrad)" />
          <rect x="125" y="172" width="105" height="62" rx="8" fill="url(#tealGrad)" />
          <rect x="215" y="172" width="110" height="62" rx="8" fill="url(#blueGrad)" />
          <rect x="180" y="215" width="62" height="110" rx="8" fill="url(#blueGrad)" />
          <circle cx="211" cy="162" r="14" fill="#134b7f" />
          <path
            d="M 182 278 C 110 320 70 200 132 142 C 180 98 235 158 210 190 C 196 172 172 122 142 156 C 98 206 128 290 190 262 Z"
            fill="url(#emeraldGrad)"
          />
          <path
            d="M 138 318 C 220 270 302 185 260 100 C 302 118 318 190 258 252 C 208 302 148 322 138 318 Z"
            fill="url(#blueGrad)"
          />
        </svg>
      )}

      {showText && (
        <div className={`flex flex-col justify-center ${isCol ? 'items-center text-center' : 'items-start text-left'} ${textClassName}`}>
          <span className="font-black tracking-tight text-slate-800 leading-none text-xl font-display">
            Klinik Puri Medika<span className="text-teal-600">.</span>
          </span>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mt-0.5 font-sans">
            Sistem Informasi Klinik
          </span>
        </div>
      )}
    </div>
  );
}
