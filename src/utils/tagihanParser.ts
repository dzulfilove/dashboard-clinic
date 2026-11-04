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
  // Cek apakah data bertipe multiline billing export (mengandung "DETAIL TINDAKAN", "SUB TOTAL", atau "SUB DEPARTEMEN")
  const isMultiLineBilling = /detail\s*tindakan/i.test(text) || 
                             /sub\s*total/i.test(text) || 
                             (/tagihan\s*\(rp\)/i.test(text) && /sub\s*departemen/i.test(text));

  if (isMultiLineBilling) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: TagihanRow[] = [];
    let cur: TagihanRow | null = null;

    for (const line of lines) {
      const c = line.split('\t').map(x => x.trim());
      if (/^no$/i.test(c[0]) && /registrasi/i.test(c[1] || '')) continue; // baris header

      // Baris data utama registrasi pasien: diawali nomor angka dan memiliki minimal 14 kolom
      const isMainRow = /^\d+$/.test(c[0]) && c.length >= 14;
      if (isMainRow) {
        if (cur) rows.push(cur);

        // Kolom standar billing 25 kolom:
        // c[1]: NO REGISTRASI
        // c[4]: NAMA PASIEN
        // c[10]: PENANGGUNG
        // c[12]: UNIT/KLINIK
        // c[13]: DOKTER
        // c[14]: TARIF PENDAFTARAN
        // c[15]: KARTU PASIEN
        // c[16]: KONSULTASI
        cur = {
          no_registrasi: c[1] || '',
          nama_pasien: c[4] || '',
          unit: c[12] || '',
          penanggung: c[10] || '',
          dokter: c[13] || '',
          tarif_pendaftaran: parseNominalId(c[14]) || 0,
          kartu_pasien: parseNominalId(c[15]) || 0,
          konsultasi: parseNominalId(c[16]) || 0,
          tindakan: 0,
          penunjang: 0,
          farmasi: 0,
          bhp: 0,
          lain_lain: 0,
          potongan: 0,
          tagihan: 0
        };
        continue;
      }

      if (!cur) continue;

      // Abaikan baris Sub Total
      if (/^sub\s*total/i.test(c[0])) continue;

      // Baris ringkasan angka tagihan (7 kolom angka: Tindakan, Penunjang, Farmasi, BHP, Lain-lain, Potongan, Tagihan)
      const nums = c.map(parseNominalId);
      if (c.length >= 7 && !nums.slice(0, 7).some(Number.isNaN)) {
        cur.tindakan = nums[0] || 0;
        cur.penunjang = nums[1] || 0;
        cur.farmasi = nums[2] || 0;
        cur.bhp = nums[3] || 0;
        cur.lain_lain = nums[4] || 0;
        cur.potongan = nums[5] || 0;
        cur.tagihan = nums[6] || 0;

        const hitung = cur.tarif_pendaftaran + cur.kartu_pasien + cur.konsultasi + cur.tindakan + cur.penunjang + cur.farmasi + cur.bhp + cur.lain_lain - cur.potongan;
        if (Math.abs(hitung - cur.tagihan) > 0.5) {
          cur.error = `Total tidak cocok dengan komponen (Dihitung: ${hitung}, Tagihan: ${cur.tagihan})`;
        }
      }
    }

    if (cur) rows.push(cur);
    return rows;
  }

  // Format satu baris per registrasi (format tabular biasa)
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
