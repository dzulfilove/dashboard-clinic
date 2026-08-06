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

export const parseIndoDate = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const cleaned = dateStr.trim().toLowerCase();

  // Try simple DD-MM-YYYY or YYYY-MM-DD
  if (cleaned.includes('-') || cleaned.includes('/')) {
    const parts = cleaned.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY
        const d = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2];
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  const months: { [key: string]: string } = {
    januari: '01', pebruari: '02', febuari: '02', februari: '02', maret: '03',
    april: '04', mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', nopember: '11', november: '11', desember: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', mei_short: '05', jun: '06',
    jul: '07', agu: '08', ags: '08', sep: '09', okt: '10', nov: '11', des: '12'
  };

  const parts = cleaned.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthWord = parts[1];
    const year = parts[2];
    const monthNum = months[monthWord] || '01';
    return `${year}-${monthNum}-${day}`;
  }

  return dateStr.trim() || new Date().toISOString().split('T')[0];
};
