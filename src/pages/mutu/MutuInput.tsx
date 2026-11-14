import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Lock, Info, CheckCircle2, AlertTriangle, CalendarDays, Loader2,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader.js';
import api from '../../services/api.js';
import Swal from '../../utils/swal.js';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_SINGKAT = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

type SelGrid = {
  tanggal: string;
  numerator: number | null;
  denominator: number | null;
  nilai: number | null;
  status: string;
  catatan?: string | null;
};

type BarisMutu = {
  id: number;
  kode: string;
  nama: string;
  cara_hitung: string;
  satuan: string;
  definisi_numerator: string | null;
  definisi_denominator: string | null;
  target: number | null;
  target_tipe: 'min' | 'max' | 'sama';
  sel: SelGrid[];
  jumlah_numerator: number;
  jumlah_denominator: number;
  capaian: number | null;
  status_capaian: string;
  hari_terisi: number;
};

type GridResp = {
  unit: string;
  tahun: number;
  bulan: number;
  jumlah_hari: number;
  hari_efektif: number;
  hari_libur: string[];
  indikator: BarisMutu[];
};

const pad = (v: number) => String(v).padStart(2, '0');
const kunciSel = (indikatorId: number, tanggal: string) => `${indikatorId}|${tanggal}`;

function statusDari(capaian: number | null, target: number | null, tipe: string): string {
  if (target === null || target === undefined) return 'tanpa_target';
  if (capaian === null) return 'tidak_dapat_dinilai';
  if (tipe === 'max') return capaian <= target ? 'tercapai' : 'tidak_tercapai';
  if (tipe === 'sama') return Math.abs(capaian - target) < 1e-9 ? 'tercapai' : 'tidak_tercapai';
  return capaian >= target ? 'tercapai' : 'tidak_tercapai';
}

const LABEL_STATUS: Record<string, { teks: string; kelas: string }> = {
  tercapai: { teks: 'Tercapai', kelas: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tidak_tercapai: { teks: 'Tidak tercapai', kelas: 'bg-rose-50 text-rose-700 border-rose-200' },
  tanpa_target: { teks: 'Tanpa target', kelas: 'bg-slate-50 text-slate-500 border-slate-200' },
  tidak_dapat_dinilai: { teks: 'Tidak dapat dinilai', kelas: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export default React.memo(function MutuInput() {
  const hariIni = new Date();
  const [unit] = useState('IGD');
  const [tahun, setTahun] = useState(hariIni.getFullYear());
  const [bulan, setBulan] = useState(hariIni.getMonth() + 1);
  const [grid, setGrid] = useState<GridResp | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [terkunci, setTerkunci] = useState(false);
  const [draf, setDraf] = useState<Record<string, { n: string; d: string }>>({});
  const [asli, setAsli] = useState<Record<string, { n: number | null; d: number | null }>>({});
  const [statusSel, setStatusSel] = useState<Record<string, 'menyimpan' | 'tersimpan' | string>>({});
  const [menyimpan, setMenyimpan] = useState(0);
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const muat = useCallback(async (senyap = false) => {
    if (!senyap) setMemuat(true);
    setGalat(null);
    try {
      const [g, p] = await Promise.all([
        api.get('/mutu/grid', { params: { unit, tahun, bulan } }),
        api.get('/mutu/periode', { params: { unit, tahun } }),
      ]);
      const data = g.data as GridResp;
      setGrid(data);
      const dp: Record<string, { n: string; d: string }> = {};
      const ap: Record<string, { n: number | null; d: number | null }> = {};
      data.indikator.forEach((b) => {
        b.sel.forEach((s) => {
          const k = kunciSel(b.id, s.tanggal);
          dp[k] = { n: s.numerator === null ? '' : String(s.numerator), d: s.denominator === null ? '' : String(s.denominator) };
          ap[k] = { n: s.numerator, d: s.denominator };
        });
      });
      setDraf(dp);
      setAsli(ap);
      setStatusSel({});
      const periodeIni = (p.data as any[]).find((x) => Number(x.bulan) === bulan);
      setTerkunci(periodeIni?.status === 'terkunci');
    } catch (e: any) {
      setGalat(e?.response?.data?.message || 'Gagal memuat data mutu.');
    } finally {
      setMemuat(false);
    }
  }, [unit, tahun, bulan]);

  useEffect(() => { muat(); }, [muat]);

  const ubahBulan = (delta: number) => {
    const d = new Date(tahun, bulan - 1 + delta, 1);
    setTahun(d.getFullYear());
    setBulan(d.getMonth() + 1);
  };

  const mintaAlasan = async (namaIndikator: string, tanggal: string, dari: string, ke: string) => {
    const res = await Swal.fire({
      title: 'Alasan perubahan',
      html: `<div style="text-align:left;font-size:13px;line-height:1.6">
        <b>${namaIndikator}</b><br/>
        Tanggal ${tanggal}<br/>
        Nilai lama <code>${dari}</code> menjadi <code>${ke}</code>
      </div>`,
      input: 'text',
      inputPlaceholder: 'Contoh: koreksi hasil hitung ulang observasi',
      showCancelButton: true,
      confirmButtonText: 'Simpan perubahan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0B1C30',
      inputValidator: (v: string) => (!v || v.trim().length < 6 ? 'Alasan wajib diisi, minimal 6 karakter.' : null),
    });
    return res.isConfirmed ? String(res.value || '').trim() : null;
  };

  const simpanSel = async (b: BarisMutu, tanggal: string) => {
    const k = kunciSel(b.id, tanggal);
    const isi = draf[k];
    if (!isi) return;
    const n = isi.n === '' ? null : Number(isi.n);
    const d = isi.d === '' ? null : Number(isi.d);
    const lama = asli[k];
    const kosongSemua = n === null && d === null;

    if (kosongSemua) {
      if (lama && (lama.n !== null || lama.d !== null)) {
        setStatusSel((s) => ({ ...s, [k]: 'Nilai tidak bisa dikosongkan. Isi angka atau hubungi Tim Mutu.' }));
      }
      return;
    }
    // Setengah terisi: pengguna masih mengetik pasangannya, jangan ganggu dengan galat.
    if ((n === null) !== (d === null)) return;
    if (n !== null && d !== null && n > d) {
      setStatusSel((s) => ({ ...s, [k]: 'Numerator tidak boleh melebihi denominator.' }));
      return;
    }
    const berubah = lama && (lama.n !== n || lama.d !== d);
    if (!berubah && lama) return;
    if (lama && berubah) {
      const alasan = await mintaAlasan(b.nama, tanggal, `${lama.n ?? '-'}/${lama.d ?? '-'}`, `${n}/${d}`);
      if (!alasan) {
        setDraf((s) => ({ ...s, [k]: { n: lama.n === null ? '' : String(lama.n), d: lama.d === null ? '' : String(lama.d) } }));
        return;
      }
      setStatusSel((s) => ({ ...s, [k]: 'menyimpan' }));
      setMenyimpan((x) => x + 1);
      try {
        await api.post('/mutu/pengukuran', { unit_kode: unit, indikator_id: b.id, tanggal, numerator: n, denominator: d, alasan });
        setAsli((s) => ({ ...s, [k]: { n, d } }));
        setStatusSel((s) => ({ ...s, [k]: 'tersimpan' }));
      } catch (e: any) {
        setStatusSel((s) => ({ ...s, [k]: e?.response?.data?.message || 'Gagal menyimpan.' }));
        if (e?.response?.status === 403) setTerkunci(true);
        setDraf((s) => ({ ...s, [k]: { n: lama.n === null ? '' : String(lama.n), d: lama.d === null ? '' : String(lama.d) } }));
      } finally {
        setMenyimpan((x) => Math.max(0, x - 1));
      }
      return;
    }
    setStatusSel((s) => ({ ...s, [k]: 'menyimpan' }));
    setMenyimpan((x) => x + 1);
    try {
      await api.post('/mutu/pengukuran', { unit_kode: unit, indikator_id: b.id, tanggal, numerator: n, denominator: d });
      setAsli((s) => ({ ...s, [k]: { n, d } }));
      setStatusSel((s) => ({ ...s, [k]: 'tersimpan' }));
      if (timer.current[k]) clearTimeout(timer.current[k]);
      timer.current[k] = setTimeout(() => setStatusSel((s) => { const c = { ...s }; delete c[k]; return c; }), 1600);
    } catch (e: any) {
      setStatusSel((s) => ({ ...s, [k]: e?.response?.data?.message || 'Gagal menyimpan.' }));
      if (e?.response?.status === 403) setTerkunci(true);
    } finally {
      setMenyimpan((x) => Math.max(0, x - 1));
    }
  };

  const ringkas = useMemo(() => {
    const hasil: Record<number, { tn: number; td: number; terisi: number; capaian: number | null; status: string }> = {};
    if (!grid) return hasil;
    grid.indikator.forEach((b) => {
      const tanggalTerisi = new Set<string>();
      let tn = 0, td = 0;
      Object.keys(draf).forEach((k) => {
        if (!k.startsWith(`${b.id}|`)) return;
        const { n, d } = draf[k];
        if (n !== '' && d !== '') {
          tn += Number(n); td += Number(d);
          tanggalTerisi.add(k.split('|')[1]);
        }
      });
      let capaian: number | null = null;
      if (td > 0) capaian = b.cara_hitung === 'rate_per_seribu' ? (tn / td) * 1000 : tn / td;
      hasil[b.id] = { tn, td, terisi: tanggalTerisi.size, capaian, status: statusDari(capaian, b.target, b.target_tipe) };
    });
    return hasil;
  }, [draf, grid]);

  const totalSel = grid ? grid.indikator.length * grid.jumlah_hari : 0;
  const selTerisi = Object.values(ringkas).reduce((s, x) => s + x.terisi, 0);

  const tanggalInfo = (t: string) => {
    const d = new Date(`${t}T00:00:00`);
    return { hari: d.getDay(), tgl: d.getDate() };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Input Indikator Mutu"
        subtitle="Catat numerator dan denominator setiap hari. Angka tersimpan begitu Anda pindah sel, dan nilai final dihitung dari jumlah, bukan rata-rata harian."
      />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-[#E5EEFF] bg-white px-2 py-1.5">
          <button onClick={() => ubahBulan(-1)} className="rounded-lg p-1.5 hover:bg-[#F4F8FF]" aria-label="Bulan sebelumnya">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-2 text-sm font-semibold text-[#0B1C30]">
            <CalendarDays size={15} className="text-[#516070]" />
            {NAMA_BULAN[bulan - 1]} {tahun}
          </div>
          <button onClick={() => ubahBulan(1)} className="rounded-lg p-1.5 hover:bg-[#F4F8FF]" aria-label="Bulan berikutnya">
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          onClick={() => { setTahun(hariIni.getFullYear()); setBulan(hariIni.getMonth() + 1); }}
          className="rounded-xl border border-[#E5EEFF] bg-white px-3 py-2 text-xs font-semibold text-[#516070] hover:bg-[#F4F8FF]"
        >
          Bulan ini
        </button>

        <button onClick={() => muat()} className="flex items-center gap-1.5 rounded-xl border border-[#E5EEFF] bg-white px-3 py-2 text-xs font-semibold text-[#516070] hover:bg-[#F4F8FF]">
          <RefreshCw size={13} className={memuat ? 'animate-spin' : ''} /> Muat ulang
        </button>

        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="rounded-lg bg-[#F4F8FF] px-2.5 py-1.5 font-semibold text-[#0B1C30]">
            Unit {unit}
          </span>
          <span className="rounded-lg bg-[#F4F8FF] px-2.5 py-1.5 text-[#516070]">
            {grid?.hari_efektif ?? 0} hari efektif
          </span>
          <span className={`rounded-lg px-2.5 py-1.5 font-semibold ${selTerisi === 0 ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
            {selTerisi} / {totalSel} sel terisi
          </span>
          {menyimpan > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-700">
              <Loader2 size={12} className="animate-spin" /> menyimpan
            </span>
          )}
        </div>
      </div>

      {terkunci && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock size={16} className="mt-0.5 shrink-0" />
          <div>
            <b>Periode ini sudah dikunci.</b> Penulisan ditolak sampai Tim Mutu membuka kembali. Hubungi admin bila ada koreksi.
          </div>
        </div>
      )}

      {galat && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>{galat}</div>
        </div>
      )}

      {/* tabel */}
      <div className="overflow-hidden rounded-2xl border border-[#E5EEFF] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FBFF] text-[#516070]">
                <th className="sticky left-0 z-20 min-w-[240px] border-b border-r border-[#E5EEFF] bg-[#F8FBFF] px-3 py-2 text-left font-semibold">
                  Indikator
                </th>
                {grid && Array.from({ length: grid.jumlah_hari }, (_, i) => {
                  const t = `${tahun}-${pad(bulan)}-${pad(i + 1)}`;
                  const info = tanggalInfo(t);
                  const libur = grid.hari_libur.includes(t);
                  return (
                    <th key={t} className={`w-[54px] min-w-[54px] border-b border-[#E5EEFF] px-1 py-1.5 text-center font-semibold ${libur || info.hari === 0 ? 'bg-rose-50/60 text-rose-500' : ''}`}>
                      <div className="text-[10px] leading-none opacity-70">{HARI_SINGKAT[info.hari]}</div>
                      <div className="mt-0.5 text-[11px] leading-none">{info.tgl}</div>
                    </th>
                  );
                })}
                <th className="border-b border-l border-[#E5EEFF] px-2 py-2 text-center font-semibold">JML</th>
                <th className="border-b border-[#E5EEFF] px-2 py-2 text-center font-semibold">%</th>
                <th className="min-w-[110px] border-b border-[#E5EEFF] px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {memuat && !grid && (
                <tr><td colSpan={40} className="px-4 py-10 text-center text-sm text-[#516070]">
                  <Loader2 size={16} className="mr-2 inline animate-spin" /> Memuat grid mutu…
                </td></tr>
              )}
              {grid && grid.indikator.length === 0 && (
                <tr><td colSpan={40} className="px-4 py-10 text-center text-sm text-[#516070]">
                  Belum ada indikator yang ditugaskan ke unit ini.
                </td></tr>
              )}
              {grid?.indikator.map((b, idx) => {
                const r = ringkas[b.id];
                const st = LABEL_STATUS[r?.status || 'tanpa_target'] || LABEL_STATUS.tanpa_target;
                return (
                  <React.Fragment key={b.id}>
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFF]'}>
                      <td rowSpan={2} className={`sticky left-0 z-10 border-b border-r border-[#E5EEFF] px-3 py-2 align-top ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFF]'}`}>
                        <div className="font-semibold text-[#0B1C30]">{b.nama}</div>
                        <div className="mt-0.5 text-[10px] font-medium text-[#8A99A8]">{b.kode} · {b.cara_hitung === 'rate_per_seribu' ? 'per 1000' : b.satuan}</div>
                        {(b.definisi_numerator || b.definisi_denominator) && (
                          <div className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-[#516070]">
                            <Info size={11} className="mt-[1px] shrink-0 text-[#8A99A8]" />
                            <span className="line-clamp-2" title={`N: ${b.definisi_numerator}\nD: ${b.definisi_denominator}`}>
                              N: {b.definisi_numerator} · D: {b.definisi_denominator}
                            </span>
                          </div>
                        )}
                      </td>
                      {grid.jumlah_hari > 0 && Array.from({ length: grid.jumlah_hari }, (_, i) => {
                        const t = `${tahun}-${pad(bulan)}-${pad(i + 1)}`;
                        const k = kunciSel(b.id, t);
                        const nilai = draf[k] || { n: '', d: '' };
                        const s = statusSel[k];
                        const err = s && !['menyimpan', 'tersimpan'].includes(s);
                        return (
                          <td key={t} className={`border-b border-[#E5EEFF] p-0 ${err ? 'bg-rose-50' : ''}`}>
                            <input
                              inputMode="numeric"
                              value={nilai.n}
                              disabled={terkunci}
                              title={err ? s : 'Numerator hari ini'}
                              onChange={(e) => setDraf((x) => ({ ...x, [k]: { ...nilai, n: e.target.value.replace(/[^0-9.]/g, '') } }))}
                              onBlur={() => simpanSel(b, t)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              className={`w-full bg-transparent px-1 py-1 text-center text-[11px] font-semibold text-[#0B1C30] outline-none focus:bg-[#EFF6FF] ${err ? 'text-rose-600' : ''} ${s === 'tersimpan' ? 'bg-emerald-50/70' : ''}`}
                            />
                          </td>
                        );
                      })}
                      <td rowSpan={2} className="border-b border-l border-[#E5EEFF] px-2 py-2 text-center align-middle">
                        <div className="font-semibold text-[#0B1C30]">{r ? `${r.tn}` : 0}</div>
                        <div className="text-[10px] text-[#8A99A8]">{r ? `${r.td}` : 0}</div>
                      </td>
                      <td rowSpan={2} className="border-b border-[#E5EEFF] px-2 py-2 text-center align-middle font-bold text-[#0B1C30]">
                        {r?.capaian === null || r?.capaian === undefined ? '—' : `${(r.capaian < 3 ? r.capaian * 100 : r.capaian).toFixed(1)}${r.capaian < 3 ? '%' : ''}`}
                      </td>
                      <td rowSpan={2} className="border-b border-[#E5EEFF] px-2 py-2 text-center align-middle">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${st.kelas}`}>{st.teks}</span>
                        <div className="mt-1 text-[10px] text-[#8A99A8]">{r?.terisi ?? 0}/{grid.hari_efektif} hari</div>
                      </td>
                    </tr>
                    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFF]'}>
                      {Array.from({ length: grid.jumlah_hari }, (_, i) => {
                        const t = `${tahun}-${pad(bulan)}-${pad(i + 1)}`;
                        const k = kunciSel(b.id, t);
                        const nilai = draf[k] || { n: '', d: '' };
                        const s = statusSel[k];
                        const err = s && !['menyimpan', 'tersimpan'].includes(s);
                        return (
                          <td key={t} className={`border-b border-[#E5EEFF] p-0 ${err ? 'bg-rose-50' : ''}`}>
                            <input
                              inputMode="numeric"
                              value={nilai.d}
                              disabled={terkunci}
                              title={err ? s : 'Denominator hari ini'}
                              onChange={(e) => setDraf((x) => ({ ...x, [k]: { ...nilai, d: e.target.value.replace(/[^0-9.]/g, '') } }))}
                              onBlur={() => simpanSel(b, t)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              className={`w-full bg-transparent px-1 py-1 text-center text-[11px] text-[#516070] outline-none focus:bg-[#EFF6FF] ${err ? 'text-rose-600' : ''} ${s === 'tersimpan' ? 'bg-emerald-50/70' : ''}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#E5EEFF] px-4 py-3 text-[11px] text-[#516070]">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100" /> baru tersimpan</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-100" /> ditolak, arahkan kursor untuk pesan</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-600" /> baris pertama tiap indikator = numerator, baris kedua = denominator</span>
          <span className="ml-auto">Nilai akhir = jumlah numerator ÷ jumlah denominator, bukan rata-rata harian.</span>
        </div>
      </div>
    </div>
  );
});
