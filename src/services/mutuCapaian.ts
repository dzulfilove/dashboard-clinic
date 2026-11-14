/**
 * Perhitungan modul mutu. Fungsi murni, tanpa akses database,
 * supaya bisa diuji dengan angka pembanding dari file Excel lama.
 */

export type CaraHitung = 'rasio' | 'rate_per_seribu' | 'angka' | 'rata_rata' | 'waktu';
export type StatusCapaian = 'tercapai' | 'tidak_tercapai' | 'tidak_dapat_dinilai' | 'tanpa_target';

export interface VersiDefinisi {
  id: number;
  indikator_id: number;
  berlaku_dari: string;      // YYYY-MM-DD
  definisi_numerator: string;
  definisi_denominator: string;
  target: number | null;
  target_tipe: 'min' | 'max' | 'sama';
}

/** Versi yang berlaku pada tanggal tertentu: berlaku_dari terbesar yang <= tanggal. */
export function pickVersi<T extends { berlaku_dari: string }>(versi: T[], tanggal: string): T | null {
  const batas = String(tanggal).slice(0, 10);
  const kandidat = versi
    .filter((v) => String(v.berlaku_dari).slice(0, 10) <= batas)
    .sort((a, b) => String(b.berlaku_dari).localeCompare(String(a.berlaku_dari)));
  return kandidat[0] ?? null;
}

/** Capaian = SUM(numerator) / SUM(denominator). BUKAN rata-rata capaian harian. */
export function hitungCapaian(
  cara: CaraHitung,
  totalNumerator: number | null,
  totalDenominator: number | null
): number | null {
  const n = Number(totalNumerator ?? 0);
  const d = Number(totalDenominator ?? 0);
  if (!isFinite(n) || !isFinite(d) || d === 0) return null;
  if (cara === 'rate_per_seribu') return (n / d) * 1000;
  if (cara === 'rasio') return n / d;
  return n / d;
}

/** Status capaian terhadap target, memperhatikan arah penilaian. */
export function statusCapaian(
  capaian: number | null,
  target: number | null,
  targetTipe: 'min' | 'max' | 'sama'
): StatusCapaian {
  if (target === null || target === undefined) return 'tanpa_target';
  if (capaian === null) return 'tidak_dapat_dinilai';
  if (targetTipe === 'min') return capaian >= target ? 'tercapai' : 'tidak_tercapai';
  if (targetTipe === 'max') return capaian <= target ? 'tercapai' : 'tidak_tercapai';
  return Math.abs(capaian - target) < 1e-9 ? 'tercapai' : 'tidak_tercapai';
}

/** Jumlah hari dalam bulan (1-12). */
export function jumlahHariBulan(tahun: number, bulan: number): number {
  return new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
}

/** Daftar tanggal YYYY-MM-DD dalam satu bulan. */
export function daftarTanggal(tahun: number, bulan: number): string[] {
  const n = jumlahHariBulan(tahun, bulan);
  const pad = (v: number) => String(v).padStart(2, '0');
  return Array.from({ length: n }, (_, i) => `${tahun}-${pad(bulan)}-${pad(i + 1)}`);
}

/**
 * Hari efektif = hari kalender dikurangi hari libur.
 * libur: daftar 'YYYY-MM-DD' yang berlaku untuk unit itu atau global.
 */
export function hariEfektif(tahun: number, bulan: number, libur: string[]): number {
  const set = new Set(libur.map((d) => String(d).slice(0, 10)));
  return daftarTanggal(tahun, bulan).filter((d) => !set.has(d)).length;
}

/** Persentase kelengkapan pengisian: hari terisi / hari efektif. */
export function kelengkapan(hariTerisi: number, efektif: number): number | null {
  if (!efektif || efektif <= 0) return null;
  return hariTerisi / efektif;
}

/** Deteksi penyebut konstan 7 hari berturut-turut (tanda angka disalin, bukan diukur). */
export function penyebutKonstan(
  harian: Array<{ tanggal: string; denominator: number | null }>,
  minimalHari = 7
): string[] {
  const terurut = [...harian].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const hasil: string[] = [];
  let streak = 1;
  for (let i = 1; i < terurut.length; i++) {
    const a = terurut[i - 1].denominator;
    const b = terurut[i].denominator;
    streak = a !== null && a === b ? streak + 1 : 1;
    if (streak === minimalHari) hasil.push(terurut[i].tanggal);
  }
  return hasil;
}

/** Rasio di atas 1 pada indikator rasio: mustahil secara makna, wajib ditinjau. */
export function rasioMustahil(cara: CaraHitung, n: number | null, d: number | null): boolean {
  if (cara !== 'rasio') return false;
  if (n === null || d === null || d === 0) return false;
  return n > d || n / d > 1;
}
