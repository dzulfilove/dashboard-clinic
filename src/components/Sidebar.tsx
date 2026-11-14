import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import Logo from './Logo.js';
import api from '../services/api.js';
import { pegas } from '../utils/pegas.js';

type IconName =
  | 'home'
  | 'lab'
  | 'labInput'
  | 'labMaster'
  | 'farmasi'
  | 'farmasiInput'
  | 'farmasiAbc'
  | 'farmasiMaster'
  | 'pelayanan'
  | 'igd'
  | 'rawatInap'
  | 'dokter'
  | 'vaksin'
  | 'master'
  | 'icd10'
  | 'wilayah'
  | 'pasien'
  | 'demografi'
  | 'diagnosa'
  | 'admin'
  | 'designSystem'
  | 'logs'
  | 'database'
  | 'logout';

interface RailMenuItem {
  groupId?: string;
  path: string;
  label: string;
  icon: IconName;
  roles: string[];
  badge?: number;
}

function RailIcon({ name, filled }: { name: IconName; filled: boolean }) {
  const stroke = filled ? 'none' : 'currentColor';
  const fill = filled ? 'currentColor' : 'none';
  const sw = 1.85;

  switch (name) {
    case 'home':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M11.3 2.5a1.1 1.1 0 0 1 1.4 0l8 6.8a1.1 1.1 0 0 1 .3.8V20a1.5 1.5 0 0 1-1.5 1.5h-4.8a.7.7 0 0 1-.7-.7v-5.3a1.5 1.5 0 0 0-1.5-1.5h-1a1.5 1.5 0 0 0-1.5 1.5v5.3a.7.7 0 0 1-.7.7H4.5A1.5 1.5 0 0 1 3 20v-9.9a1.1 1.1 0 0 1 .3-.8l8-6.8Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-5.5a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5V21h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      );

    case 'lab':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 3.5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2h-1v4.2a3.5 3.5 0 0 1-.9 2.35l-2.6 2.86 3.9 5.5A1.5 1.5 0 0 1 17.18 21.5H6.82a1.5 1.5 0 0 1-1.22-2.09l3.9-5.5-2.6-2.86A3.5 3.5 0 0 1 6 8.7V4.5H5a1 1 0 0 1-1-1Zm5.8 11.45-2.3 3.25h9l-2.3-3.25a1 1 0 0 1 .08-1.26l.28-.31H9.44l.28.31a1 1 0 0 1 .08 1.26Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3h6" />
          <path d="M10 3v5.5L5.2 17.8A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.7L14 8.5V3" />
          <path d="M7.5 14.5h9" />
        </svg>
      );

    case 'labInput':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M8.5 2.5a1 1 0 0 0 0 2h.5v13.2a3 3 0 1 0 6 0V4.5h.5a1 1 0 1 0 0-2h-7Zm2.5 9.5h2v5.7a1 1 0 1 1-2 0V12Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 3h6" />
          <path d="M10 3v14a2 2 0 1 0 4 0V3" />
          <path d="M10 11h4" />
        </svg>
      );

    case 'labMaster':
    case 'master':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2.4 2.8 7.1a.9.9 0 0 0 0 1.6l9.2 4.7 9.2-4.7a.9.9 0 0 0 0-1.6L12 2.4Z" />
          <path fill="currentColor" d="m3.5 11.4 8.5 4.3 8.5-4.3a.9.9 0 1 1 .8 1.6l-8.9 4.5a.9.9 0 0 1-.8 0L2.7 13a.9.9 0 1 1 .8-1.6Z" />
          <path fill="currentColor" d="m3.5 15.6 8.5 4.3 8.5-4.3a.9.9 0 1 1 .8 1.6l-8.9 4.5a.9.9 0 0 1-.8 0l-8.9-4.5a.9.9 0 1 1 .8-1.6Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
          <path d="m3 12 9 4.5 9-4.5" />
          <path d="m3 16.5 9 4.5 9-4.5" />
        </svg>
      );

    case 'farmasi':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10.5 3.6a5.1 5.1 0 0 1 7.2 7.2l-1.9 1.9-7.2-7.2 1.9-1.9Zm-3.3 3.3-3.6 3.6a5.1 5.1 0 0 0 7.2 7.2l3.6-3.6-7.2-7.2Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );

    case 'farmasiInput':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M9 2.5A1.5 1.5 0 0 0 7.5 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.5A1.5 1.5 0 0 0 15 2.5H9Zm0 7.5h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 4h4a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="8" y="2.5" width="8" height="3.5" rx="1" />
          <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
          <path d="M9 11h6" />
          <path d="M9 15h4" />
        </svg>
      );

    case 'farmasiAbc':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="12" width="4.5" height="9" rx="1.4" fill="currentColor" />
          <rect x="9.75" y="7" width="4.5" height="14" rx="1.4" fill="currentColor" />
          <rect x="16.5" y="3" width="4.5" height="18" rx="1.4" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="12" width="4" height="8.5" rx="1" />
          <rect x="10" y="7.5" width="4" height="13" rx="1" />
          <rect x="16.5" y="3.5" width="4" height="17" rx="1" />
        </svg>
      );

    case 'farmasiMaster':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2.3 3.5 6.8l8.5 4.6 8.5-4.6L12 2.3Zm-9.2 6v9.1l8.4 4.5v-9.1L2.8 8.3Zm10 13.6 8.4-4.5V8.3l-8.4 4.5v9.1Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.5 3.5 7v10l8.5 4.5 8.5-4.5V7L12 2.5Z" />
          <path d="M3.5 7 12 11.5 20.5 7" />
          <path d="M12 11.5v10" />
        </svg>
      );

    case 'pelayanan':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7 2.5a1 1 0 0 1 1 1V5h8V3.5a1 1 0 1 1 2 0V5h1a2.5 2.5 0 0 1 2.5 2.5v12A2.5 2.5 0 0 1 19 22H5a2.5 2.5 0 0 1-2.5-2.5v-12A2.5 2.5 0 0 1 5 5h1V3.5a1 1 0 0 1 1-1Zm4 8.5v2H9a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-2v-2a1 1 0 1 0-2 0Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2.5" />
          <path d="M7.5 3v3.5" />
          <path d="M16.5 3v3.5" />
          <path d="M12 10.5v6" />
          <path d="M9 13.5h6" />
        </svg>
      );

    case 'igd':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 21.2c-.3 0-.6-.1-.85-.3C5.35 16.35 2.5 12.95 2.5 8.85A5.35 5.35 0 0 1 12 5.45a5.35 5.35 0 0 1 9.5 3.4c0 4.1-2.85 7.5-8.65 12.05-.25.2-.55.3-.85.3Zm-1.2-11.1-1.3 2.4H6.8a.8.8 0 0 0 0 1.6h3.2c.3 0 .58-.16.72-.43l.83-1.52 1.4 3.25a.8.8 0 0 0 1.46.02l1.04-2.12h1.75a.8.8 0 0 0 0-1.6h-2.25a.8.8 0 0 0-.72.44l-.48.98-1.45-3.36a.8.8 0 0 0-1.5.34Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 12h3.8l2.2-5 3.5 10 2.5-5H21.5" />
        </svg>
      );

    case 'rawatInap':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 5.5a1 1 0 0 1 1 1v4.5h4.5A2.5 2.5 0 0 1 11 8.5h7.5A3.5 3.5 0 0 1 22 12v6.5a1 1 0 1 1-2 0V16H4v2.5a1 1 0 1 1-2 0v-12a1 1 0 0 1 1-1Zm4.2 1.8a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 6v13" />
          <path d="M2 15h20" />
          <path d="M22 19v-7a3 3 0 0 0-3-3h-8v6" />
          <circle cx="6.5" cy="10" r="2" />
        </svg>
      );

    case 'dokter':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="7.5" r="4" fill="currentColor" />
          <path fill="currentColor" d="M4.2 20.5a7.8 7.8 0 0 1 15.6 0 .8.8 0 0 1-.8.8H5a.8.8 0 0 1-.8-.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="7.5" r="3.5" />
          <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </svg>
      );

    case 'vaksin':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.2 4 5.6v5.8c0 5.1 3.4 9.7 8 11 4.6-1.3 8-5.9 8-11V5.6l-8-3.4Zm-.9 6.3h1.8v2.6h2.6v1.8h-2.6v2.6h-1.8v-2.6H8.5v-1.8h2.6V8.5Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.5 4.5 5.8v5.5c0 4.8 3.2 9.1 7.5 10.2 4.3-1.1 7.5-5.4 7.5-10.2V5.8L12 2.5Z" />
          <path d="M12 8.5v7" />
          <path d="M8.5 12h7" />
        </svg>
      );

    case 'icd10':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M6 2.5A2.5 2.5 0 0 0 3.5 5v14A2.5 2.5 0 0 0 6 21.5h12a2.5 2.5 0 0 0 2.5-2.5V8.3a1.5 1.5 0 0 0-.44-1.06l-4.3-4.3A1.5 1.5 0 0 0 14.7 2.5H6Zm2.5 8h7a.8.8 0 1 1 0 1.6h-7a.8.8 0 1 1 0-1.6Zm0 4h5a.8.8 0 1 1 0 1.6h-5a.8.8 0 1 1 0-1.6Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L14.5 3Z" />
          <path d="M14 3v5.5h5.5" />
          <path d="M8.5 12.5h7" />
          <path d="M8.5 16h5" />
        </svg>
      );

    case 'wilayah':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.2a7.3 7.3 0 0 0-7.3 7.3c0 5.1 6.2 11.4 6.65 11.86a.9.9 0 0 0 1.3 0C13.1 20.9 19.3 14.6 19.3 9.5A7.3 7.3 0 0 0 12 2.2Zm0 10a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-6.5-6.2-6.5-11.5a6.5 6.5 0 1 1 13 0C18.5 14.8 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.3" />
        </svg>
      );

    case 'pasien':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="currentColor" />
          <circle cx="9" cy="10.5" r="2" fill="#213145" />
          <path d="M5.8 15.8a3.5 3.5 0 0 1 6.4 0" stroke="#213145" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M14.5 10.5h3.5M14.5 14h3.5" stroke="#213145" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <circle cx="9" cy="10.5" r="1.8" />
          <path d="M6 15.5a3.3 3.3 0 0 1 6 0" />
          <path d="M14.5 10.5h3.5" />
          <path d="M14.5 14h3.5" />
        </svg>
      );

    case 'demografi':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="2.2" fill="currentColor" />
          <rect x="13" y="3" width="8" height="8" rx="2.2" fill="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="2.2" fill="currentColor" />
          <rect x="13" y="13" width="8" height="8" rx="2.2" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </svg>
      );

    case 'diagnosa':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M11 2.1A9.9 9.9 0 1 0 21.9 13H11V2.1Zm2 0V11h8.9A9.92 9.92 0 0 0 13 2.1Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12A9 9 0 1 1 12 3v9h9Z" />
          <path d="M14.5 3.4A9 9 0 0 1 20.6 9.5H14.5V3.4Z" />
        </svg>
      );

    case 'admin':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9.5" cy="8" r="3.5" fill="currentColor" />
          <path fill="currentColor" d="M2.5 19.5a6.5 6.5 0 0 1 14 0 .8.8 0 0 1-.8.8H3.3a.8.8 0 0 1-.8-.8Z" />
          <circle cx="17" cy="9" r="2.5" fill="currentColor" />
          <path fill="currentColor" d="M17.2 13.5a5 5 0 0 1 4.3 5 .7.7 0 0 1-.7.7h-2.9a8 8 0 0 0-1.4-5.4c.23-.2.47-.3.7-.3Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9.5" cy="8" r="3.2" />
          <path d="M3 19.5a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="2.2" />
          <path d="M18.2 14a4.5 4.5 0 0 1 3.3 4.3" />
        </svg>
      );

    case 'designSystem':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 4.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm1.1 10.7h-2.2a.8.8 0 1 1 0-1.6h.3v-3.5h-.3a.8.8 0 1 1 0-1.6h1.1a.8.8 0 0 1 .8.8v4.3h.3a.8.8 0 1 1 0 1.6Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 11v5" />
          <circle cx="12" cy="7.8" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'logs':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2.2a9.8 9.8 0 1 0 9.8 9.8A9.8 9.8 0 0 0 12 2.2Zm.9 9.5 3.1 1.9a.9.9 0 1 1-.9 1.5l-3.6-2.2a.9.9 0 0 1-.4-.8V7.2a.9.9 0 1 1 1.8 0v4.5Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );

    case 'database':
      return filled ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="5.5" rx="7.5" ry="3" fill="currentColor" />
          <path fill="currentColor" d="M4.5 8.5v4c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-4c-1.65 1.15-4.38 1.8-7.5 1.8s-5.85-.65-7.5-1.8Z" />
          <path fill="currentColor" d="M4.5 14.5v4c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-4c-1.65 1.15-4.38 1.8-7.5 1.8s-5.85-.65-7.5-1.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
          <path d="M4.5 5.5v13c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-13" />
          <path d="M4.5 12c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8" />
        </svg>
      );

    case 'logout':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default React.memo(function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [criticalStockCount, setCriticalStockCount] = useState<number>(5);
  const railRef = useRef<HTMLElement>(null);
  const penandaRef = useRef<HTMLDivElement>(null);

  const prevRef = useRef<{
    height: number;
    markerTop: number | null;
    hrefs: Set<string>;
    key: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchCriticalCount() {
      try {
        const res = await api.get('/obat/forecast?bulan=11&tahun=2026');
        if (active && Array.isArray(res.data)) {
          const count = res.data.filter(
            (item: any) => item.status_stok === 'Kritis (Perlu Order)'
          ).length;
          setCriticalStockCount(count > 0 ? count : 5);
        }
      } catch {
        if (active) setCriticalStockCount(5);
      }
    }
    fetchCriticalCount();
    return () => {
      active = false;
    };
  }, []);

  const role = user?.role ?? 'admin';

  const contextId = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/lab')) return 'lab';
    if (p.startsWith('/farmasi')) return 'farmasi';
    if (p.startsWith('/pelayanan')) return 'pelayanan';
    if (p.startsWith('/demografi')) return 'demografi';
    if (p.startsWith('/admin') || p === '/design-system') return 'sistem';
    return 'home';
  }, [location.pathname]);

  const activeParentGroup = contextId;

  const baseItems: RailMenuItem[] = useMemo(() => {
    const all: RailMenuItem[] = [
      {
        groupId: 'home',
        path: '/',
        label: 'Dashboard Terpadu',
        icon: 'home',
        roles: ['admin', 'lab', 'farmasi', 'perawat', 'analis'],
      },
      {
        groupId: 'lab',
        path: '/lab/dashboard',
        label: 'Laboratorium',
        icon: 'lab',
        roles: ['admin', 'analis'],
      },
      {
        groupId: 'farmasi',
        path: '/farmasi/forecast',
        label: 'Farmasi & Apotek',
        icon: 'farmasi',
        roles: ['admin', 'farmasi'],
        badge: criticalStockCount > 0 ? criticalStockCount : undefined,
      },
      {
        groupId: 'pelayanan',
        path: '/pelayanan/rawat-jalan',
        label: 'Pelayanan Klinik',
        icon: 'pelayanan',
        roles: ['admin', 'perawat'],
      },
      {
        groupId: 'demografi',
        path: '/demografi/pasien',
        label: 'Demografi Kunjungan',
        icon: 'demografi',
        roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'],
      },
      role === 'admin'
        ? {
            groupId: 'sistem',
            path: '/admin/users',
            label: 'Administrasi Sistem',
            icon: 'admin',
            roles: ['admin'],
          }
        : {
            groupId: 'sistem',
            path: '/design-system',
            label: 'Panduan Sistem',
            icon: 'designSystem',
            roles: ['lab', 'farmasi', 'perawat', 'analis'],
          },
    ];

    return all.filter((item) => item.roles.includes(role));
  }, [role, criticalStockCount]);

  const contextItems: RailMenuItem[] = useMemo(() => {
    let items: RailMenuItem[] = [];
    if (contextId === 'lab') {
      items = [
        { path: '/lab/input', label: 'Input Pemeriksaan Lab', icon: 'labInput', roles: ['admin', 'analis'] },
        { path: '/lab/master', label: 'Master Pemeriksaan Lab', icon: 'labMaster', roles: ['admin', 'analis'] },
      ];
    } else if (contextId === 'farmasi') {
      items = [
        { path: '/farmasi/input', label: 'Konsumsi Obat Harian', icon: 'farmasiInput', roles: ['admin', 'farmasi'] },
        { path: '/farmasi/abc', label: 'Analisis ABC Spend', icon: 'farmasiAbc', roles: ['admin', 'farmasi'] },
        { path: '/farmasi/master', label: 'Master Data Obat', icon: 'farmasiMaster', roles: ['admin', 'farmasi'] },
      ];
    } else if (contextId === 'pelayanan') {
      items = [
        { path: '/pelayanan/dashboard-dokter', label: 'Dashboard Dokter', icon: 'dokter', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/igd', label: 'IGD (Gawat Darurat)', icon: 'igd', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/rawat-inap', label: 'Rawat Inap', icon: 'rawatInap', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/followup-vaksin', label: 'Follow Up Vaksin', icon: 'vaksin', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/master-tindakan', label: 'Master Data Tindakan', icon: 'master', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/master-icd10', label: 'Master Data ICD-10', icon: 'icd10', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/master-dokter', label: 'Master Data Dokter', icon: 'admin', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/master-pasien', label: 'Master Data Pasien', icon: 'pasien', roles: ['admin', 'perawat'] },
        { path: '/pelayanan/master-wilayah', label: 'Master Wilayah', icon: 'wilayah', roles: ['admin', 'perawat'] },
      ];
    } else if (contextId === 'demografi') {
      items = [
        {
          path: '/demografi/diagnosa',
          label: 'Demografi Diagnosa',
          icon: 'diagnosa',
          roles: ['admin', 'perawat', 'analis', 'farmasi', 'lab'],
        },
      ];
    } else if (contextId === 'sistem' && role === 'admin') {
      items = [
        { path: '/design-system', label: 'Design System Guide', icon: 'designSystem', roles: ['admin'] },
        { path: '/admin/logs', label: 'Log Aktivitas', icon: 'logs', roles: ['admin'] },
        { path: '/admin/db-settings', label: 'Pengaturan Database', icon: 'database', roles: ['admin'] },
      ];
    }

    return items.filter((item) => item.roles.includes(role));
  }, [contextId, role]);

  const groupCount = contextItems.length > 0 ? 3 : 2;
  const menuKey = `${groupCount}|${contextId}|${role}|${location.pathname}`;

  const updateMarkerAndAnimate = (isResizeSync = false) => {
    const rail = railRef.current;
    const penanda = penandaRef.current;
    if (!rail || !penanda) return;

    const isDesktop = window.matchMedia('(min-width: 720px)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const itemEls = Array.from(rail.querySelectorAll<HTMLAnchorElement>('.rail-item'));
    const currentHrefs = new Set(itemEls.map((el) => el.getAttribute('href') || ''));

    if (!isDesktop) {
      rail.classList.remove('rail-cair');
      penanda.style.opacity = '0';
      prevRef.current = {
        height: rail.offsetHeight,
        markerTop: null,
        hrefs: currentHrefs,
        key: menuKey,
      };
      return;
    }

    const activeEl = rail.querySelector<HTMLAnchorElement>('.rail-item[aria-current="page"]');

    if (prevRef.current === null) {
      const baru = rail.offsetHeight;
      const ke = activeEl ? activeEl.offsetTop : null;
      if (ke !== null) {
        penanda.style.transform = `translateY(${ke}px)`;
        penanda.style.opacity = '1';
      } else {
        penanda.style.opacity = '0';
      }
      rail.classList.add('rail-cair');
      prevRef.current = {
        height: baru,
        markerTop: ke,
        hrefs: currentHrefs,
        key: menuKey,
      };
      return;
    }

    const prev = prevRef.current;
    if (!isResizeSync && prev.key === menuKey) {
      return;
    }

    rail.getAnimations().forEach((anim) => {
      if (!(anim instanceof CSSAnimation)) anim.cancel();
    });
    penanda.getAnimations().forEach((anim) => {
      if (!(anim instanceof CSSAnimation)) anim.cancel();
    });

    const baru = rail.offsetHeight;
    const ke = activeEl ? activeEl.offsetTop : null;
    rail.classList.add('rail-cair');

    if (isResizeSync || reduceMotion) {
      if (ke !== null) {
        penanda.style.transform = `translateY(${ke}px)`;
        penanda.style.opacity = '1';
      } else {
        penanda.style.opacity = '0';
      }
      prevRef.current = {
        height: baru,
        markerTop: ke,
        hrefs: currentHrefs,
        key: menuKey,
      };
      return;
    }

    const lama = prev.height;

    if (baru !== lama) {
      rail.classList.add('rail-dinamis');
      rail.animate(
        [{ height: `${lama}px` }, { height: `${baru}px` }],
        { duration: 800, easing: pegas() }
      );
      const mekar = baru > lama;
      rail.animate(
        [
          { transform: 'scaleX(1)' },
          { transform: `scaleX(${mekar ? 1.1 : 0.92})`, offset: 0.25 },
          { transform: `scaleX(${mekar ? 0.96 : 1.04})`, offset: 0.55 },
          { transform: 'scaleX(1.015)', offset: 0.8 },
          { transform: 'scaleX(1)' },
        ],
        { duration: 750, easing: 'ease-out', composite: 'add' }
      );
    }

    const newItems = itemEls.filter((el) => {
      const href = el.getAttribute('href') || '';
      return href !== '' && !prev.hrefs.has(href);
    });

    if (newItems.length > 0) {
      rail.classList.add('rail-dinamis');
      newItems.forEach((butirBaru, urutan) => {
        butirBaru.animate(
          [
            { opacity: 0, transform: 'scale(.2)', filter: 'blur(6px)' },
            { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
          ],
          {
            duration: 650,
            delay: 90 + urutan * 45,
            easing: pegas(),
            fill: 'backwards',
          }
        );
      });
    }

    const dari = prev.markerTop;
    if (ke === null) {
      penanda.style.opacity = '0';
    } else if (dari === null) {
      penanda.style.transform = `translateY(${ke}px)`;
      penanda.style.opacity = '1';
      penanda.animate(
        [
          { opacity: 0, transform: `translateY(${ke}px) scale(.2)` },
          { opacity: 1, transform: `translateY(${ke}px) scale(1)` },
        ],
        { duration: 600, easing: pegas() }
      );
    } else if (dari !== ke) {
      const jarak = ke - dari;
      const regang = 1 + Math.min(Math.abs(jarak) / 48, 3) * 0.45;
      const tengah = dari + jarak * 0.55;
      penanda.style.transform = `translateY(${ke}px)`;
      penanda.style.opacity = '1';
      penanda.animate(
        [
          { transform: `translateY(${dari}px) scaleY(1)` },
          {
            transform: `translateY(${tengah}px) scaleY(${regang}) scaleX(.82)`,
            offset: 0.45,
          },
          {
            transform: `translateY(${ke}px) scaleY(.86) scaleX(1.08)`,
            offset: 0.75,
          },
          { transform: `translateY(${ke}px) scaleY(1)` },
        ],
        { duration: 650, easing: 'cubic-bezier(.3, .7, .2, 1)' }
      );
    } else {
      penanda.style.transform = `translateY(${ke}px)`;
      penanda.style.opacity = '1';
    }

    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }

    prevRef.current = {
      height: baru,
      markerTop: ke,
      hrefs: currentHrefs,
      key: menuKey,
    };
  };

  useLayoutEffect(() => {
    updateMarkerAndAnimate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)');
    const handleChange = () => updateMarkerAndAnimate(true);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey]);

  const handleLogout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  return (
    <aside id="side-navigation" className="rail-kolom">
      <nav ref={railRef} className="rail" aria-label="Menu utama">
        <div className="rail-scroll">
          <div ref={penandaRef} className="rail-penanda" aria-hidden="true" />

          <div className="rail-brand-wrap" title="Klinik Puri Medika">
            <div className="rail-brand-slot">
              <div className="rail-brand">
                <Logo size={24} />
              </div>
            </div>
            <div className="rail-brand-text">
              <span className="rail-brand-title">
                Puri Medika<span>.</span>
              </span>
              <span className="rail-brand-sub">Sistem Klinik</span>
            </div>
          </div>

          <div className="rail-gap" aria-hidden="true" />

          {baseItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            const showSubHere = item.groupId === activeParentGroup && contextItems.length > 0;
            return (
              <React.Fragment key={item.path}>
                <Link
                  to={item.path}
                  className="rail-item"
                  aria-label={item.label}
                  data-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="rail-ikon">
                    <RailIcon name={item.icon} filled={isActive} />
                    {item.badge !== undefined && (
                      <span className="rail-badge">{item.badge}</span>
                    )}
                  </span>
                  <span className="rail-label">{item.label}</span>
                </Link>

                {showSubHere && (
                  <>
                    {contextItems.map((subItem) => {
                      const isSubActive = location.pathname === subItem.path;
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className="rail-item rail-item--sub"
                          aria-label={subItem.label}
                          data-label={subItem.label}
                          aria-current={isSubActive ? 'page' : undefined}
                        >
                          <span className="rail-ikon">
                            <RailIcon name={subItem.icon} filled={isSubActive} />
                          </span>
                          <span className="rail-label">{subItem.label}</span>
                        </Link>
                      );
                    })}
                    {idx < baseItems.length - 1 && (
                      <div className="rail-gap" aria-hidden="true" />
                    )}
                  </>
                )}
              </React.Fragment>
            );
          })}

          <div className="rail-gap" aria-hidden="true" />

          <a
            href="#/login"
            onClick={handleLogout}
            className="rail-item rail-item--logout"
            aria-label="Keluar dari Sistem"
            data-label="Keluar dari Sistem"
          >
            <span className="rail-ikon">
              <RailIcon name="logout" filled={false} />
            </span>
            <span className="rail-label">Keluar</span>
          </a>
        </div>
      </nav>
    </aside>
  );
});
