
/**
 * Uji pemetaan peran. Jalankan: npx tsx scripts/test-role.ts
 * Kasus diambil dari data Baserow nyata (31 akun) + kasus yang dulu salah.
 */
import { extractRole, normalizeRole } from '../src/utils/role.js';

let gagal = 0;
function eq(actual: any, expected: any, label: string) {
  const ok = actual === expected;
  if (!ok) gagal++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${actual}${ok ? '' : ` (harap: ${expected})`}`);
}

console.log('--- extractRole: dari data Baserow nyata ---');
eq(extractRole('', 'IT'), 'admin', "divisi IT (8 akun)");
eq(extractRole('', 'Perawat'), 'perawat', "divisi Perawat");
eq(extractRole('perawat', 'Perawat'), 'perawat', "peran perawat + divisi Perawat");
eq(extractRole('', 'Laboratorium'), 'analis', "divisi Laboratorium");
eq(extractRole('', 'Farmasi'), 'farmasi', "divisi Farmasi");
eq(extractRole('', 'Keuangan / Akunting/Perpajakan'), 'viewer', "divisi Keuangan (dulu admin)");
eq(extractRole('', 'Marketing'), 'viewer', "divisi Marketing (dulu admin)");
eq(extractRole('', 'Gizi'), 'viewer', "divisi Gizi (dulu admin)");
eq(extractRole('', 'Tenaga Kesehatan Lingungan'), 'viewer', "divisi Kesling (dulu admin)");
eq(extractRole('', ''), 'viewer', "peran & divisi kosong (dulu admin)");
eq(extractRole(null, null), 'viewer', "null/null (dulu admin)");

console.log('\n--- extractRole: peran eksplisit menang atas divisi ---');
eq(extractRole('perawat', 'IT'), 'perawat', "peran perawat walau divisi IT (dulu admin)");
eq(extractRole('analis', 'Marketing'), 'analis', "peran analis walau divisi Marketing");

console.log('\n--- extractRole: peran baru untuk modul mutu ---');
eq(extractRole('', 'Kepala Unit'), 'kepala_unit', "divisi Kepala Unit");
eq(extractRole('', 'Tim Mutu'), 'mutu', "divisi Tim Mutu");
eq(extractRole('', 'Auditor Internal'), 'auditor', "divisi Auditor");
eq(extractRole('auditor', ''), 'auditor', "peran auditor");

console.log('\n--- kasus jebakan substring ---');
eq(extractRole('', 'Unit Gawat Darurat'), 'viewer', "'Unit' TIDAK boleh jadi admin (dulu: admin)");
eq(extractRole('', 'Ruang Intensif'), 'viewer', "'Intensif' tidak boleh jadi admin");
eq(extractRole('', 'Administrasi Umum'), 'admin', "'Administrasi' tetap admin (perilaku lama)");

console.log('\n--- normalizeRole: nilai dari JWT / localStorage ---');
eq(normalizeRole('admin'), 'admin', 'string admin');
eq(normalizeRole('lab'), 'analis', 'string lab -> analis');
eq(normalizeRole(''), 'viewer', 'string kosong');
eq(normalizeRole(null), 'viewer', 'null');
eq(normalizeRole(undefined), 'viewer', 'undefined');
eq(normalizeRole(['perawat']), 'perawat', 'array');
eq(normalizeRole([]), 'viewer', 'array kosong');
eq(normalizeRole('[{"value":"farmasi"}]'), 'farmasi', 'JSON array objek');
eq(normalizeRole({ value: 'mutu' }), 'mutu', 'objek dengan .value');
eq(normalizeRole('marketing'), 'viewer', 'string tak dikenal');
eq(normalizeRole('viewer'), 'viewer', 'idempoten viewer');

console.log(gagal === 0 ? '\nSEMUA LULUS' : `\n${gagal} GAGAL`);
process.exit(gagal === 0 ? 0 : 1);
