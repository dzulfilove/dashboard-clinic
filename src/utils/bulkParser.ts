import { TIPE_UNIT_RAWAT_JALAN } from '../types.js';

export const parseJenisKelamin = (jkStr: string): string => {
  if (!jkStr) return '';
  const j = jkStr.toLowerCase().trim();
  if (j.startsWith('l') || j === 'pria') return 'L';
  if (j.startsWith('p') || j === 'wanita') return 'P';
  return jkStr;
};

export const matchUnit = (unitStr: string): string | null => {
  if (!unitStr) return null;
  const cleaned = unitStr.toUpperCase().trim();
  
  // Direct substring or match lookup in TIPE_UNIT_RAWAT_JALAN
  const found = TIPE_UNIT_RAWAT_JALAN.find(u => 
    u.toUpperCase() === cleaned ||
    u.toUpperCase().includes(cleaned) || 
    cleaned.includes(u.toUpperCase()) ||
    u.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(cleaned.replace(/[^A-Z0-9]/g, '')) ||
    cleaned.replace(/[^A-Z0-9]/g, '').includes(u.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  );

  if (found) return found;

  // Common Indonesian aliases mapping
  if (cleaned.includes('POLI UMUM') || cleaned === 'UMUM') return 'PL003 (POLI UMUM)';
  if (cleaned.includes('POLI KIA') || cleaned === 'KIA') return 'PL001 (POLI KIA)';
  if (cleaned.includes('POLI ANAK') || cleaned === 'ANAK') return 'PL005 (POLI ANAK)';
  if (cleaned.includes('POLI THT') || cleaned === 'THT') return 'PL002 (POLI THT)';
  if (cleaned.includes('POLI OBGYN') || cleaned.includes('KANDUNGAN') || cleaned === 'OBGYN') return 'PL006 (POLI OBGYN)';
  if (cleaned.includes('POLI MATA') || cleaned === 'MATA') return 'MT (POLI MATA)';
  if (cleaned.includes('POLI PENYAKIT DALAM') || cleaned === 'DALAM' || cleaned.includes('INTERNA')) return 'PPD (POLI PENYAKIT DALAM)';
  if (cleaned.includes('POLI PARU') || cleaned === 'PARU') return 'PR (POLI PARU)';
  if (cleaned.includes('POLI GIGI') || cleaned.includes('GIGI DAN MULUT')) return 'GGM (POLI GIGI DAN MULUT)';
  if (cleaned.includes('FISIOTERAPI') || cleaned.includes('REHABILITASI')) return 'PL004 (POLI FISIOTERAPI)';
  if (cleaned.includes('SARAF') || cleaned.includes('NEUROLOGI')) return 'SARAF (POLI SARAF)';
  if (cleaned.includes('JANTUNG') || cleaned.includes('KARDIO')) return 'JPD (POLI JANTUNG DAN PEMBULUH DARAH)';
  if (cleaned.includes('UROLOGI')) return 'URO (POLI UROLOGI)';
  if (cleaned.includes('BEDAH UMUM')) return 'BU (POLI BEDAH UMUM)';
  if (cleaned.includes('ORTOPEDI')) return 'ORT (POLI ORTOPEDI)';
  if (cleaned.includes('HOMECARE') || cleaned.includes('HC')) return 'HC (HOMECARE)';
  if (cleaned.includes('IGD')) return 'IGD';
  if (cleaned.includes('RAWAT INAP') || cleaned.includes('RANAP') || cleaned.includes('IRI')) return 'IRI (RAWAT INAP)';
  if (cleaned.includes('LABORATORIUM') || cleaned.includes('LAB')) return 'LABORATORIUM';
  
  return null;
};
