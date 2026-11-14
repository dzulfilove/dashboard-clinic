/**
 * Router modul Mutu & Indikator.
 * Dipisah dari server.ts (monolit) agar tidak menambah berkas itu.
 */
import { Router } from 'express';
import {
  pickVersi, hitungCapaian, statusCapaian, jumlahHariBulan,
  hariEfektif, kelengkapan, penyebutKonstan, rasioMustahil,
  type CaraHitung, type VersiDefinisi,
} from '../services/mutuCapaian.js';

const READ = ['admin', 'mutu', 'kepala_unit', 'auditor'];
const WRITE = ['admin', 'mutu', 'kepala_unit'];
const pad = (v: number) => String(v).padStart(2, '0');
const bulanAwal = (t: number, b: number) => `${t}-${pad(b)}-01`;
const bulanAkhir = (t: number, b: number) => `${t}-${pad(b)}-${pad(jumlahHariBulan(t, b))}`;

export function createMutuRouter(deps: { db: any; authenticateToken: any; roleGuard: any }) {
  const { db, authenticateToken, roleGuard } = deps;
  const r = Router();
  const auth = authenticateToken;
  const read = roleGuard(READ);
  const write = roleGuard(WRITE);

  const butuhMySQL = (_req: any, res: any, next: any) => {
    const st = typeof db.getDiagnosticStatus === 'function' ? db.getDiagnosticStatus() : null;
    if (st && st.isVirtual) return res.status(503).json({ message: 'Modul mutu membutuhkan database MySQL.' });
    next();
  };

  r.use(auth, butuhMySQL);

  /* ---------------- master ---------------- */
  r.get('/ping', read, (_req: any, res: any) => res.json({ ok: true }));

  r.get('/aturan', read, async (_req: any, res: any) => {
    res.json(await db.query('SELECT id, kode, nama, keterangan, tingkat, aktif FROM mutu_aturan_validasi ORDER BY id'));
  });

  r.get('/indikator', read, async (_req: any, res: any) => {
    const ind = await db.query('SELECT id, kode, nama, kategori, satuan, cara_hitung, aktif FROM mutu_indikator ORDER BY id');
    const versi = await db.query('SELECT id, indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe FROM mutu_indikator_versi ORDER BY indikator_id, berlaku_dari DESC') as VersiDefinisi[];
    const hariIni = new Date().toISOString().slice(0, 10);
    res.json(ind.map((i: any) => {
      const milik = versi.filter((v) => Number(v.indikator_id) === Number(i.id));
      return { ...i, versi_aktif: pickVersi(milik, hariIni), jumlah_versi: milik.length };
    }));
  });

  r.post('/indikator', write, async (req: any, res: any) => {
    const b = req.body || {};
    if (!b.kode || !b.nama) return res.status(400).json({ message: 'kode dan nama wajib diisi.' });
    if (!b.definisi_numerator || !b.definisi_denominator) return res.status(400).json({ message: 'definisi_numerator dan definisi_denominator wajib diisi.' });
    const ada = await db.query('SELECT id FROM mutu_indikator WHERE kode = ?', [b.kode]);
    if (ada.length) return res.status(409).json({ message: `Kode indikator ${b.kode} sudah dipakai.` });
    const ins = await db.query(
      'INSERT INTO mutu_indikator (kode, nama, kategori, satuan, cara_hitung) VALUES (?,?,?,?,?)',
      [b.kode, b.nama, b.kategori || 'Nasional', b.satuan || '%', b.cara_hitung || 'rasio']);
    const id = ins.insertId;
    await db.query(
      'INSERT INTO mutu_indikator_versi (indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe, catatan, dibuat_oleh) VALUES (?,?,?,?,?,?,?,?)',
      [id, b.berlaku_dari || `${new Date().getFullYear()}-01-01`, b.definisi_numerator, b.definisi_denominator,
       b.target ?? null, b.target_tipe || 'min', b.catatan ?? null, req.user?.email ?? null]);
    res.status(201).json({ id, message: 'Indikator dibuat.' });
  });

  r.post('/indikator/:id/versi', write, async (req: any, res: any) => {
    const b = req.body || {};
    const id = Number(req.params.id);
    if (!b.berlaku_dari || !b.definisi_numerator || !b.definisi_denominator) return res.status(400).json({ message: 'berlaku_dari, definisi_numerator, definisi_denominator wajib diisi.' });
    const ada = await db.query('SELECT id FROM mutu_indikator WHERE id = ?', [id]);
    if (!ada.length) return res.status(404).json({ message: 'Indikator tidak ditemukan.' });
    const dobel = await db.query('SELECT id FROM mutu_indikator_versi WHERE indikator_id = ? AND berlaku_dari = ?', [id, b.berlaku_dari]);
    if (dobel.length) return res.status(409).json({ message: 'Versi untuk tanggal itu sudah ada.' });
    await db.query(
      'INSERT INTO mutu_indikator_versi (indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe, catatan, dibuat_oleh) VALUES (?,?,?,?,?,?,?,?)',
      [id, b.berlaku_dari, b.definisi_numerator, b.definisi_denominator, b.target ?? null, b.target_tipe || 'min', b.catatan ?? null, req.user?.email ?? null]);
    res.status(201).json({ message: 'Versi definisi baru diterbitkan.' });
  });

  /* ---------------- grid & capaian ---------------- */
  async function indikatorUnit(unit: string, tahun: number, bulan: number) {
    return db.query(
      `SELECT i.id, i.kode, i.nama, i.kategori, i.satuan, i.cara_hitung, ui.urutan
         FROM mutu_unit_indikator ui JOIN mutu_indikator i ON i.id = ui.indikator_id
        WHERE ui.unit_kode = ? AND i.aktif = 1 AND ui.berlaku_dari <= ?
          AND (ui.berlaku_sampai IS NULL OR ui.berlaku_sampai >= ?)
        ORDER BY ui.urutan, i.id`,
      [unit, bulanAkhir(tahun, bulan), bulanAwal(tahun, bulan)]);
  }

  r.get('/grid', read, async (req: any, res: any) => {
    const unit = String(req.query.unit || 'IGD');
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const bulan = Number(req.query.bulan) || new Date().getMonth() + 1;
    const awal = bulanAwal(tahun, bulan), akhir = bulanAkhir(tahun, bulan);
    const indikator = await indikatorUnit(unit, tahun, bulan);
    const pengukuran = await db.query(
      `SELECT indikator_id, DATE_FORMAT(tanggal,'%Y-%m-%d') AS tanggal, numerator, denominator, nilai, status, sumber, catatan
         FROM mutu_pengukuran WHERE unit_kode = ? AND tanggal BETWEEN ? AND ?`, [unit, awal, akhir]);
    const versi = await db.query('SELECT id, indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe FROM mutu_indikator_versi') as VersiDefinisi[];
    const libur = await db.query(
      `SELECT DATE_FORMAT(tanggal,'%Y-%m-%d') AS tanggal FROM mutu_hari_libur
        WHERE (unit_kode = ? OR unit_kode IS NULL) AND tanggal BETWEEN ? AND ?`, [unit, awal, akhir]);

    const baris = indikator.map((i: any) => {
      const v = pickVersi(versi.filter((x) => Number(x.indikator_id) === Number(i.id)), akhir);
      const sel = pengukuran.filter((p: any) => Number(p.indikator_id) === Number(i.id));
      const tn = sel.reduce((s: number, x: any) => s + Number(x.numerator ?? 0), 0);
      const td = sel.reduce((s: number, x: any) => s + Number(x.denominator ?? 0), 0);
      const adaAngka = sel.some((x: any) => x.numerator !== null);
      const capaian = adaAngka ? hitungCapaian(i.cara_hitung as CaraHitung, tn, td) : null;
      const target = v && v.target !== null ? Number(v.target) : null;
      return {
        id: i.id, kode: i.kode, nama: i.nama, kategori: i.kategori, satuan: i.satuan, cara_hitung: i.cara_hitung,
        definisi_numerator: v?.definisi_numerator ?? null, definisi_denominator: v?.definisi_denominator ?? null,
        target, target_tipe: v?.target_tipe ?? 'min',
        sel: sel.map((x: any) => ({ tanggal: x.tanggal, numerator: x.numerator === null ? null : Number(x.numerator),
          denominator: x.denominator === null ? null : Number(x.denominator),
          nilai: x.nilai === null ? null : Number(x.nilai), status: x.status, sumber: x.sumber, catatan: x.catatan })),
        jumlah_numerator: tn, jumlah_denominator: td,
        hari_terisi: sel.filter((x: any) => x.numerator !== null || x.nilai !== null).length,
        capaian, status_capaian: statusCapaian(capaian, target, (v?.target_tipe ?? 'min') as any),
      };
    });

    res.json({ unit, tahun, bulan, jumlah_hari: jumlahHariBulan(tahun, bulan),
      hari_efektif: hariEfektif(tahun, bulan, libur.map((l: any) => l.tanggal)),
      hari_libur: libur.map((l: any) => l.tanggal), indikator: baris });
  });

  r.get('/capaian', read, async (req: any, res: any) => {
    const unit = String(req.query.unit || 'IGD');
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const bulan = Number(req.query.bulan) || new Date().getMonth() + 1;
    const dari = String(req.query.dari || bulanAwal(tahun, bulan));
    const sampai = String(req.query.sampai || bulanAkhir(tahun, bulan));
    const rows = await db.query(
      `SELECT i.id, i.kode, i.nama, i.cara_hitung, COUNT(p.id) AS hari_terisi,
              SUM(p.numerator) AS tn, SUM(p.denominator) AS td
         FROM mutu_unit_indikator ui JOIN mutu_indikator i ON i.id = ui.indikator_id
         LEFT JOIN mutu_pengukuran p ON p.indikator_id = i.id AND p.unit_kode = ? AND p.tanggal BETWEEN ? AND ?
        WHERE ui.unit_kode = ? AND i.aktif = 1
        GROUP BY i.id, i.kode, i.nama, i.cara_hitung ORDER BY i.id`,
      [unit, dari, sampai, unit]);
    const versi = await db.query('SELECT id, indikator_id, berlaku_dari, definisi_numerator, definisi_denominator, target, target_tipe FROM mutu_indikator_versi') as VersiDefinisi[];
    res.json({ unit, dari, sampai, indikator: rows.map((x: any) => {
      const v = pickVersi(versi.filter((y) => Number(y.indikator_id) === Number(x.id)), sampai);
      const capaian = Number(x.hari_terisi) ? hitungCapaian(x.cara_hitung as CaraHitung, Number(x.tn), Number(x.td)) : null;
      const target = v && v.target !== null ? Number(v.target) : null;
      return { id: x.id, kode: x.kode, nama: x.nama, cara_hitung: x.cara_hitung,
        hari_terisi: Number(x.hari_terisi), jumlah_numerator: Number(x.tn ?? 0), jumlah_denominator: Number(x.td ?? 0),
        capaian, target, target_tipe: v?.target_tipe ?? 'min',
        status_capaian: statusCapaian(capaian, target, (v?.target_tipe ?? 'min') as any) };
    }) });
  });

  r.get('/kelengkapan', read, async (req: any, res: any) => {
    const unit = String(req.query.unit || 'IGD');
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const bulan = Number(req.query.bulan) || new Date().getMonth() + 1;
    const awal = bulanAwal(tahun, bulan), akhir = bulanAkhir(tahun, bulan);
    const libur = await db.query(
      `SELECT DATE_FORMAT(tanggal,'%Y-%m-%d') AS tanggal FROM mutu_hari_libur
        WHERE (unit_kode = ? OR unit_kode IS NULL) AND tanggal BETWEEN ? AND ?`, [unit, awal, akhir]);
    const efektif = hariEfektif(tahun, bulan, libur.map((l: any) => l.tanggal));
    const rows = await db.query(
      `SELECT indikator_id, COUNT(DISTINCT tanggal) AS hari_terisi FROM mutu_pengukuran
        WHERE unit_kode = ? AND tanggal BETWEEN ? AND ? AND numerator IS NOT NULL GROUP BY indikator_id`,
      [unit, awal, akhir]);
    res.json({ unit, tahun, bulan, hari_efektif: efektif, indikator: rows.map((x: any) => ({
      indikator_id: Number(x.indikator_id), hari_terisi: Number(x.hari_terisi),
      kelengkapan: kelengkapan(Number(x.hari_terisi), efektif) })) });
  });

  /* ---------------- input pengukuran ---------------- */
  async function aturanId(kode: string): Promise<number | null> {
    const rows = await db.query('SELECT id FROM mutu_aturan_validasi WHERE kode = ? AND aktif = 1', [kode]);
    return rows.length ? Number(rows[0].id) : null;
  }

  r.post('/pengukuran', write, async (req: any, res: any) => {
    const b = req.body || {};
    const unit = String(b.unit_kode || 'IGD');
    const indikatorId = Number(b.indikator_id);
    const tanggal = String(b.tanggal || '').slice(0, 10);
    if (!indikatorId || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ message: 'indikator_id dan tanggal (YYYY-MM-DD) wajib diisi.' });
    const kosong = (v: any) => v === undefined || v === null || v === '';
    const n = kosong(b.numerator) ? null : Number(b.numerator);
    const d = kosong(b.denominator) ? null : Number(b.denominator);
    const nilai = kosong(b.nilai) ? null : Number(b.nilai);
    const email = req.user?.email ?? null;
    const th = Number(tanggal.slice(0, 4)), bl = Number(tanggal.slice(5, 7));

    const periode = await db.query('SELECT status FROM mutu_periode WHERE unit_kode = ? AND tahun = ? AND bulan = ?', [unit, th, bl]);
    if (periode.length && periode[0].status === 'terkunci') return res.status(403).json({ message: 'Periode sudah dikunci. Hubungi Tim Mutu untuk membuka kembali.' });

    if ((n === null) !== (d === null)) return res.status(422).json({ message: 'Numerator dan denominator harus diisi bersama, atau keduanya kosong dengan catatan.' });
    if (n === null && nilai === null && !b.catatan) return res.status(422).json({ message: 'Isi numerator/denominator, atau nilai, atau catatan alasan.' });

    const ind = await db.query('SELECT cara_hitung FROM mutu_indikator WHERE id = ?', [indikatorId]);
    if (!ind.length) return res.status(404).json({ message: 'Indikator tidak ditemukan.' });
    const cara = ind[0].cara_hitung as CaraHitung;

    if (n !== null && d !== null && n > d) {
      return res.status(422).json({ message: 'Numerator tidak boleh melebihi denominator. Periksa definisi penyebut (jumlah petugas atau jumlah peluang).', aturan: 'N_GT_D' });
    }

    const lama = await db.query('SELECT id, numerator, denominator, nilai FROM mutu_pengukuran WHERE unit_kode = ? AND indikator_id = ? AND tanggal = ?', [unit, indikatorId, tanggal]);
    if (lama.length) {
      const L = lama[0];
      const berubah = Number(L.numerator) !== n || Number(L.denominator) !== d || Number(L.nilai) !== nilai;
      if (berubah && !b.alasan) return res.status(422).json({ message: 'Perubahan nilai wajib menyertakan alasan.' });
      await db.query('UPDATE mutu_pengukuran SET numerator=?, denominator=?, nilai=?, catatan=?, dicatat_oleh=? WHERE id=?', [n, d, nilai, b.catatan ?? null, email, L.id]);
      if (berubah) {
        await db.query('INSERT INTO mutu_pengukuran_revisi (pengukuran_id, numerator_lama, denominator_lama, nilai_lama, numerator_baru, denominator_baru, nilai_baru, alasan, diubah_oleh) VALUES (?,?,?,?,?,?,?,?,?)',
          [L.id, L.numerator, L.denominator, L.nilai, n, d, nilai, String(b.alasan), email]);
      }
    } else {
      await db.query('INSERT INTO mutu_pengukuran (unit_kode, indikator_id, tanggal, numerator, denominator, nilai, catatan, dicatat_oleh) VALUES (?,?,?,?,?,?,?,?)',
        [unit, indikatorId, tanggal, n, d, nilai, b.catatan ?? null, email]);
    }

    const anomali: string[] = [];
    if (rasioMustahil(cara, n, d)) {
      const aid = await aturanId('RASIO_GT_100');
      if (aid) {
        await db.query('INSERT IGNORE INTO mutu_pengukuran_anomali (pengukuran_id, aturan_id, keterangan) SELECT id, ?, ? FROM mutu_pengukuran WHERE unit_kode=? AND indikator_id=? AND tanggal=?',
          [aid, `Capaian ${n}/${d} melebihi 100%`, unit, indikatorId, tanggal]);
        anomali.push('RASIO_GT_100');
      }
    }
    const riwayat = await db.query(
      `SELECT DATE_FORMAT(tanggal,'%Y-%m-%d') AS tanggal, denominator FROM mutu_pengukuran
        WHERE unit_kode=? AND indikator_id=? AND tanggal BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ? ORDER BY tanggal`,
      [unit, indikatorId, tanggal, tanggal]);
    if (penyebutKonstan(riwayat.map((x: any) => ({ tanggal: x.tanggal, denominator: x.denominator === null ? null : Number(x.denominator) }))).length) {
      const aid = await aturanId('D_KONSTAN');
      if (aid) {
        await db.query('INSERT IGNORE INTO mutu_pengukuran_anomali (pengukuran_id, aturan_id, keterangan) SELECT id, ?, ? FROM mutu_pengukuran WHERE unit_kode=? AND indikator_id=? AND tanggal=?',
          [aid, 'Penyebut sama selama 7 hari berturut-turut', unit, indikatorId, tanggal]);
        anomali.push('D_KONSTAN');
      }
    }

    res.json({ message: 'Tersimpan.', anomali });
  });

  /* ---------------- anomali ---------------- */
  r.get('/anomali', read, async (req: any, res: any) => {
    const unit = String(req.query.unit || 'IGD');
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    const bulan = Number(req.query.bulan) || new Date().getMonth() + 1;
    const status = req.query.status ? String(req.query.status) : null;
    const sql = `SELECT a.id, a.status, a.keterangan, a.diputuskan_oleh, a.diputuskan_pada, a.alasan_keputusan,
              t.kode AS aturan, t.tingkat, i.kode AS indikator_kode, i.nama AS indikator,
              DATE_FORMAT(p.tanggal,'%Y-%m-%d') AS tanggal, p.numerator, p.denominator
         FROM mutu_pengukuran_anomali a
         JOIN mutu_aturan_validasi t ON t.id = a.aturan_id
         JOIN mutu_pengukuran p ON p.id = a.pengukuran_id
         JOIN mutu_indikator i ON i.id = p.indikator_id
        WHERE p.unit_kode = ? AND p.tanggal BETWEEN ? AND ?` + (status ? ' AND a.status = ?' : '') + ' ORDER BY p.tanggal DESC';
    const params: any[] = [unit, bulanAwal(tahun, bulan), bulanAkhir(tahun, bulan)];
    if (status) params.push(status);
    res.json(await db.query(sql, params));
  });

  r.post('/anomali/:id/putuskan', write, async (req: any, res: any) => {
    const id = Number(req.params.id);
    const keputusan = String(req.body?.keputusan || '');
    const alasan = String(req.body?.alasan || '').trim();
    if (!['diterima', 'diabaikan'].includes(keputusan)) return res.status(400).json({ message: 'keputusan harus "diterima" atau "diabaikan".' });
    if (alasan.length < 6) return res.status(422).json({ message: 'Alasan wajib diisi (minimal 6 karakter).' });
    const ada = await db.query('SELECT id FROM mutu_pengukuran_anomali WHERE id = ?', [id]);
    if (!ada.length) return res.status(404).json({ message: 'Anomali tidak ditemukan.' });
    await db.query('UPDATE mutu_pengukuran_anomali SET status=?, alasan_keputusan=?, diputuskan_oleh=?, diputuskan_pada=NOW() WHERE id=?',
      [keputusan, alasan, req.user?.email ?? null, id]);
    res.json({ message: 'Keputusan tersimpan.' });
  });

  /* ---------------- periode ---------------- */
  r.get('/periode', read, async (req: any, res: any) => {
    const unit = String(req.query.unit || 'IGD');
    const tahun = Number(req.query.tahun) || new Date().getFullYear();
    res.json(await db.query('SELECT id, unit_kode, tahun, bulan, status, catatan, dikunci_oleh, dikunci_pada FROM mutu_periode WHERE unit_kode=? AND tahun=? ORDER BY bulan', [unit, tahun]));
  });

  r.post('/periode/:tahun/:bulan/kunci', write, async (req: any, res: any) => {
    const unit = String(req.body?.unit_kode || req.query.unit || 'IGD');
    const tahun = Number(req.params.tahun), bulan = Number(req.params.bulan);
    const terbuka = await db.query(
      `SELECT COUNT(*) AS jml FROM mutu_pengukuran_anomali a JOIN mutu_pengukuran p ON p.id = a.pengukuran_id
        WHERE p.unit_kode=? AND p.tanggal BETWEEN ? AND ? AND a.status='terbuka'`,
      [unit, bulanAwal(tahun, bulan), bulanAkhir(tahun, bulan)]);
    if (Number(terbuka[0].jml) > 0) return res.status(422).json({ message: `Tidak bisa dikunci: ${terbuka[0].jml} anomali masih terbuka.` });
    await db.query(
      `INSERT INTO mutu_periode (unit_kode, tahun, bulan, status, dikunci_oleh, dikunci_pada) VALUES (?,?,?,'terkunci',?,NOW())
       ON DUPLICATE KEY UPDATE status='terkunci', dikunci_oleh=VALUES(dikunci_oleh), dikunci_pada=NOW()`,
      [unit, tahun, bulan, req.user?.email ?? null]);
    res.json({ message: 'Periode dikunci.' });
  });

  r.post('/periode/:tahun/:bulan/buka', roleGuard(['admin']), async (req: any, res: any) => {
    const unit = String(req.body?.unit_kode || req.query.unit || 'IGD');
    const tahun = Number(req.params.tahun), bulan = Number(req.params.bulan);
    const alasan = String(req.body?.alasan || '').trim();
    if (alasan.length < 6) return res.status(422).json({ message: 'Alasan membuka kunci wajib diisi.' });
    await db.query(
      `UPDATE mutu_periode SET status='terbuka', catatan=CONCAT(COALESCE(catatan,''),' | dibuka oleh ',?,': ',?) 
        WHERE unit_kode=? AND tahun=? AND bulan=?`,
      [req.user?.email ?? '-', alasan, unit, tahun, bulan]);
    res.json({ message: 'Periode dibuka kembali.' });
  });

  return r;
}
