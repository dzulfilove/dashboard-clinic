export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const formatTanggalIndo = (tanggalStr: string | null | undefined): string => {
  if (!tanggalStr) return '-';
  try {
    const rawDate = tanggalStr.includes('T') ? tanggalStr.split('T')[0] : tanggalStr;
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${MONTHS_ID[monthIndex]} ${year}`;
      }
    }
    const d = new Date(tanggalStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    console.warn('Gagal memformat tanggal:', e);
  }
  return String(tanggalStr);
};

export const formatJamIndo = (jamStr: string | null | undefined): string => {
  if (!jamStr) return '-';
  const parts = jamStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return jamStr;
};

export const parseIndoDate = (dateStr: string | null | undefined): string => {
  const today = new Date().toISOString().split('T')[0];
  if (!dateStr) return today;

  let cleaned = String(dateStr).trim();
  if (!cleaned || cleaned === '-' || cleaned.toLowerCase() === 'null') return today;

  // If there is time component (e.g. 14-08-2026 10:30:00 or 2026-08-14T10:30), strip time
  if (cleaned.includes('T')) {
    cleaned = cleaned.split('T')[0].trim();
  } else if (cleaned.includes(' ')) {
    const spaceParts = cleaned.split(/\s+/);
    if (spaceParts.length >= 2 && (spaceParts[1].includes(':') || spaceParts[0].includes('-') || spaceParts[0].includes('/'))) {
      cleaned = spaceParts[0].trim();
    }
  }

  // Check Excel serial number (e.g. 45000)
  if (/^\d{5}$/.test(cleaned)) {
    try {
      const serial = parseInt(cleaned, 10);
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + serial * 86400000);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
  }

  // Try standard delimiter: -, /, or .
  if (cleaned.includes('-') || cleaned.includes('/') || cleaned.includes('.')) {
    const parts = cleaned.split(/[-/.]/);
    if (parts.length === 3) {
      const p0 = parts[0].trim();
      const p1 = parts[1].trim();
      const p2 = parts[2].trim();

      // Check if p0 is 4 digits -> YYYY-MM-DD
      if (p0.length === 4 && !isNaN(Number(p0))) {
        const y = p0;
        const m = p1.padStart(2, '0');
        const d = p2.padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      // Check if p2 is 4 digits -> DD-MM-YYYY
      if (p2.length === 4 && !isNaN(Number(p2))) {
        const y = p2;
        const m = p1.padStart(2, '0');
        const d = p0.padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      // Check if p2 is 2 digits (e.g. 14-08-26 -> 2026-08-14)
      if (p2.length === 2 && !isNaN(Number(p2))) {
        const y = Number(p2) > 50 ? `19${p2}` : `20${p2}`;
        const m = p1.padStart(2, '0');
        const d = p0.padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  const months: { [key: string]: string } = {
    januari: '01', pebruari: '02', febuari: '02', februari: '02', maret: '03',
    april: '04', mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', nopember: '11', november: '11', desember: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', mei_short: '05', jun: '06',
    jul: '07', agu: '08', agt: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12'
  };

  const parts = cleaned.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthWord = parts[1].toLowerCase();
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    const monthNum = months[monthWord] || '01';
    if (!isNaN(Number(day)) && !isNaN(Number(year))) {
      return `${year}-${monthNum}-${day}`;
    }
  }

  return cleaned.length === 10 && cleaned.includes('-') ? cleaned : today;
};
