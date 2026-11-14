/**
 * Uji perhitungan modul mutu dengan angka pembanding dari file Excel asli.
 * Jalankan: npx tsx scripts/test-mutu.ts
 */
import {
  pickVersi, hitungCapaian, statusCapaian, jumlahHariBulan,
  hariEfektif, kelengkapan, penyebutKonstan, rasioMustahil,
} from '../src/services/mutuCapaian.js';

let gagal = 0;
function eq(a: any, b: any, label: string, toleransi = 1e-9) {
  const ok = typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) <= toleransi : a === b;
  if (!ok) gagal++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${a}${ok ? '' : ` (harap: ${b})`}`);
}

console.log('--- capaian periode = SUM(n)/SUM(d), bukan rata-rata harian ---');
eq(hitungCapaian('rasio', 114, 130)!, 0.8769230769230769, 'Des 2025 Cuci Tangan 114/130');
eq(hitungCapaian('rasio', 79, 120)!, 0.6583333333333333, 'Agu 2025 79/120');
eq(hitungCapaian('rasio', 171, 150)!, 1.14, 'Sep 2026 171/150 (harus >1, jadi anomali)');
eq(hitungCapaian('rasio', 141, 132)!, 1.0681818181818181, 'Mei 2026 APD 141/132');

console.log('\n--- bobot harian tidak boleh menyamakan hari kecil dan hari besar ---');
// 1/1 (100%) dan 1/9 (11,1%): rata-rata persen = 0,556; SUM/SUM = 2/10 = 0,2
eq(hitungCapaian('rasio', 1 + 1, 1 + 9)!, 0.2, 'SUM/SUM dua hari berbobot beda');
eq((1 / 1 + 1 / 9) / 2, 0.5555555555555556, 'rata-rata harian (pembanding, TIDAK dipakai)', 1e-6);

console.log('\n--- satuan rate per 1000 ---');
eq(hitungCapaian('rate_per_seribu', 2, 400)!, 5, '2 kejadian / 400 hari infus = 5 per 1000');

console.log('\n--- penyebut nol / kosong ---');
eq(hitungCapaian('rasio', 0, 0), null, 'penyebut 0 -> null (bukan 0%, bukan error)');
eq(hitungCapaian('rasio', null, null), null, 'kosong -> null');

console.log('\n--- status capaian + arah ---');
eq(statusCapaian(0.88, 0.95, 'min'), 'tidak_tercapai', 'kepatuhan 88% vs target 95%');
eq(statusCapaian(0.96, 0.95, 'min'), 'tercapai', 'kepatuhan 96% vs target 95%');
eq(statusCapaian(1.5, 2, 'max'), 'tercapai', 'phlebitis 1,5 vs maks 2');
eq(statusCapaian(3, 2, 'max'), 'tidak_tercapai', 'phlebitis 3 vs maks 2');
eq(statusCapaian(0.9, null, 'min'), 'tanpa_target', 'target kosong');
eq(statusCapaian(null, 0.95, 'min'), 'tidak_dapat_dinilai', 'capaian null');

console.log('\n--- kalender & kelengkapan ---');
eq(jumlahHariBulan(2025, 2), 28, 'Feb 2025 = 28 hari');
eq(jumlahHariBulan(2024, 2), 29, 'Feb 2024 kabisat = 29 hari');
eq(jumlahHariBulan(2026, 12), 31, 'Des 2026 = 31 hari');
eq(hariEfektif(2026, 1, ['2026-01-01', '2026-01-15']), 29, 'Januari 31 hari - 2 libur');
eq(hariEfektif(2026, 1, []), 31, 'tanpa libur');
eq(kelengkapan(26, 29)!, 26 / 29, '26 dari 29 hari efektif');
eq(kelengkapan(0, 0), null, 'efektif 0 -> null');

console.log('\n--- versi definisi bertanggal ---');
const versi = [
  { id: 1, berlaku_dari: '2025-01-01', definisi_denominator: 'petugas' },
  { id: 2, berlaku_dari: '2026-03-01', definisi_denominator: 'peluang' },
];
eq(pickVersi(versi, '2025-12-31')!.id, 1, 'Des 2025 pakai versi lama');
eq(pickVersi(versi, '2026-03-01')!.id, 2, 'tepat tanggal berlaku pakai versi baru');
eq(pickVersi(versi, '2026-06-30')!.id, 2, 'Jun 2026 pakai versi baru');
eq(pickVersi(versi, '2024-12-31'), null, 'sebelum versi pertama -> null');

console.log('\n--- deteksi penyebut konstan & rasio mustahil ---');
const harian = [1,2,3,4,5,6,7].map((d) => ({ tanggal: `2026-01-0${d}`, denominator: 5 }));
eq(penyebutKonstan(harian).length, 1, 'penyebut 5 selama 7 hari -> tertandai');
eq(penyebutKonstan(harian, 8).length, 0, 'ambang 8 hari -> belum tertandai');
eq(rasioMustahil('rasio', 6, 5), true, 'n=6 d=5 pada indikator rasio');
eq(rasioMustahil('rate_per_seribu', 6, 5), false, 'rate per 1000 tidak dianggap mustahil');

console.log(gagal === 0 ? '\nSEMUA LULUS' : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
