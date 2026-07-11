import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = /app\.post\('\/api\/obat\/konsumsi', authenticateToken, roleGuard\(\['admin', 'farmasi'\]\), async \(req: any, res\) => \{[\s\S]*?\n\}\);/m;

const newEndpoint = `app.post('/api/obat/konsumsi', authenticateToken, roleGuard(['admin', 'farmasi']), async (req: any, res) => {
  const { tanggal, obat_id, penerimaan, pemakaian, retur_hilang } = req.body;
  if (!tanggal || !obat_id) {
    return res.status(400).json({ message: 'Informasi obat dan tanggal harus lengkap.' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if medicine exists and has initial balance for the input year
    const [medicines] = await conn.query('SELECT * FROM obat_master WHERE id = ?', [Number(obat_id)]);
    if (!medicines || medicines.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Obat tidak ditemukan.' });
    }

    const m = medicines[0];
    const dateObj = new Date(tanggal);
    const inputYear = dateObj.getFullYear();

    if (!m.saldo_awal_tahun || Number(m.saldo_awal_tahun) !== inputYear) {
      await conn.rollback();
      return res.status(400).json({ 
        message: \`Gagal: Saldo awal tahun \${inputYear} belum diinput untuk obat \${m.nama_obat || ''}. Silakan input saldo awal terlebih dahulu.\` 
      });
    }

    // 1. Insert/Update Harian (Only raw values, let recalc compute stocks)
    await conn.query(
      'INSERT INTO obat_konsumsi_harian (obat_id, tanggal, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) VALUES (?, ?, 0, ?, ?, ?, 0, ?) ON DUPLICATE KEY UPDATE penerimaan = VALUES(penerimaan), pemakaian = VALUES(pemakaian), retur_hilang = VALUES(retur_hilang), input_by = VALUES(input_by)',
      [Number(obat_id), String(tanggal), Number(penerimaan || 0), Number(pemakaian || 0), Number(retur_hilang || 0), req.user.id]
    );

    // 2. Recalculate chain
    const { warnings } = await recalcObatChain(conn, Number(obat_id));

    await conn.commit();
    conn.release();

    res.json({ 
      success: true, 
      message: 'Laporan harian konsumsi obat berhasil disimpan.', 
      warnings 
    });
  } catch (err: any) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    res.status(500).json({ message: err.message });
  }
});`;

code = code.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server.ts', code);
console.log("POST /api/obat/konsumsi patched");
