
/**
 * Sumber tunggal pemetaan peran (backend + frontend).
 *
 * Prinsip: GAGAL-TERTUTUP. Nilai yang tidak dikenali menjadi 'viewer',
 * bukan 'admin'. Sebelumnya nilai tak dikenal jatuh ke 'admin', sehingga
 * akun tanpa peran jelas mendapat akses penuh ke /api/admin/* dan /api/db/*.
 */
export type AppRole =
  | 'admin' | 'perawat' | 'analis' | 'farmasi'
  | 'mutu' | 'kepala_unit' | 'auditor' | 'viewer';

export const MUTU_ROLES: AppRole[] = ['admin', 'mutu', 'kepala_unit', 'auditor'];
export const READ_ONLY_ROLES: AppRole[] = ['auditor', 'viewer'];

function toText(v: any): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(' ');
  if (typeof v === 'object') {
    return toText((v as any).value ?? (v as any).Value ?? (v as any).name ?? (v as any).Name ?? (v as any).label ?? '');
  }
  return String(v);
}

function matchRole(s: string): AppRole | null {
  if (!s) return null;
  if (/\bauditor\b/.test(s)) return 'auditor';
  if (s.includes('kepala unit') || s.includes('kepala ruang') || s.includes('kepala ruangan') || /\bkaru\b/.test(s)) return 'kepala_unit';
  if (s.includes('mutu')) return 'mutu';
  if (s.includes('admin') || /\bit\b/.test(s) || s.includes('developer') || s.includes('owner') || /\bsys\b/.test(s)) return 'admin';
  if (s.includes('perawat') || s.includes('nurse')) return 'perawat';
  if (s.includes('analis') || s.includes('analyst') || /\blab\b/.test(s) || s.includes('laboratorium')) return 'analis';
  if (s.includes('farmasi') || s.includes('apotek')) return 'farmasi';
  return null;
}

/** Peran eksplisit menang; divisi hanya cadangan. Tak dikenal -> viewer. */
export function extractRole(peranField: any, divisiField: any): AppRole {
  const peran = toText(peranField).toLowerCase().trim();
  const divisi = toText(divisiField).toLowerCase().trim();
  return matchRole(peran) ?? matchRole(divisi) ?? 'viewer';
}

/** Untuk nilai peran dari JWT / localStorage yang mungkin JSON atau array. */
export function normalizeRole(role: any): AppRole {
  let v: any = role;
  for (let i = 0; i < 4; i++) {
    if (v === null || v === undefined) return 'viewer';
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) return 'viewer';
      if (t.startsWith('[') || t.startsWith('{')) {
        try { v = JSON.parse(t); continue; } catch { return matchRole(t.toLowerCase()) ?? 'viewer'; }
      }
      return matchRole(t.toLowerCase()) ?? 'viewer';
    }
    if (Array.isArray(v)) { if (!v.length) return 'viewer'; v = v[0]; continue; }
    if (typeof v === 'object') { v = v.value ?? v.Value ?? v.name ?? v.Name ?? v.label ?? ''; continue; }
    v = String(v);
  }
  return matchRole(String(v).toLowerCase()) ?? 'viewer';
}
