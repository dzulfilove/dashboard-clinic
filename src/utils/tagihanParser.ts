export interface TagihanRow {
  no_registrasi: string;
  nama_pasien: string;
  unit: string;
  penanggung: string;
  dokter: string;
  tarif_pendaftaran: number;
  kartu_pasien: number;
  konsultasi: number;
  tindakan: number;
  penunjang: number;
  farmasi: number;
  bhp: number;
  lain_lain: number;
  potongan: number;
  tagihan: number;
  error?: string;
}

// 10 kolom nominal selalu ada di ujung kanan baris; kolom teks di depannya bisa bertambah (mis. PEMBAYARAN)
export const NOMINAL_KEYS = ['tarif_pendaftaran', 'kartu_pasien', 'konsultasi', 'tindakan', 'penunjang', 'farmasi', 'bhp', 'lain_lain', 'potongan', 'tagihan'] as const;

// "1.102.072,00" -> 1102072 ; NaN jika bukan angka
export const parseNominalId = (s: string): number => {
  const t = (s ?? '').trim();
  if (!/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(t)) return NaN;
  return Number(t.replace(/\./g, '').replace(',', '.'));
};

export const parseTagihanText = (text: string): TagihanRow[] => {
  const rows: TagihanRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const c = line.split('\t').map(x => x.trim());
    if (/^no$/i.test(c[0]) && /registrasi/i.test(c[1] || '')) continue; // baris header

    // Format lama 19 kolom; format baru menyisipkan kolom PEMBAYARAN sehingga kolom setelah PASIEN bergeser
    const shift = Math.max(0, c.length - 19);
    const row: TagihanRow = {
      no_registrasi: c[1] || '',
      nama_pasien: c[2] || '',
      unit: c[3 + shift] || '',
      penanggung: c[6 + shift] || '',
      dokter: c[7 + shift] || '',
      tarif_pendaftaran: 0, kartu_pasien: 0, konsultasi: 0, tindakan: 0, penunjang: 0,
      farmasi: 0, bhp: 0, lain_lain: 0, potongan: 0, tagihan: 0
    };

    if (c.length < 19) {
      row.error = `Kolom kurang (${c.length}/19)`;
    } else if (!row.no_registrasi) {
      row.error = 'No registrasi kosong';
    } else {
      NOMINAL_KEYS.forEach((k, i) => { row[k] = parseNominalId(c[c.length - 10 + i]); });
      if (NOMINAL_KEYS.some(k => Number.isNaN(row[k]))) {
        row.error = 'Nominal tidak valid';
      } else {
        const hitung = row.tarif_pendaftaran + row.kartu_pasien + row.konsultasi + row.tindakan + row.penunjang + row.farmasi + row.bhp + row.lain_lain - row.potongan;
        if (Math.abs(hitung - row.tagihan) > 0.5) row.error = 'Total tidak cocok dengan komponen';
      }
    }
    rows.push(row);
  }
  return rows;
};

export const formatRupiah = (n: number | string | null | undefined): string =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
