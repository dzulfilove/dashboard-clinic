import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = /app\.post\('\/api\/obat\/saldo-awal', authenticateToken, roleGuard\(\['admin', 'farmasi'\]\), async \(req: any, res\) => \{[\s\S]*?\n\}\);/m;

const newEndpoint = `app.post('/api/obat/saldo-awal', authenticateToken, roleGuard(['admin', 'farmasi']), async (req: any, res) => {
  const { obat_id, tahun, bulan, saldo_awal_nilai } = req.body;
  if (!obat_id || !tahun || !bulan) {
    return res.status(400).json({ message: 'Obat ID, Tahun, dan Bulan wajib diisi.' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    
    const status = db.getDiagnosticStatus();
    if (status.isVirtual) {
      // the virtual DB logic inside query won't natively use connection well for writes if we bypass it, but for our case, it uses db.query internally.
      // We will just do the update and then recalc
      await conn.query(
        'UPDATE obat_master SET saldo_awal_tahun = ?, saldo_awal_bulan = ?, saldo_awal_nilai = ? WHERE id = ?',
        [Number(tahun), Number(bulan), Number(saldo_awal_nilai || 0), Number(obat_id)]
      );
    } else {
      await conn.query(
        'UPDATE obat_master SET saldo_awal_tahun = ?, saldo_awal_bulan = ?, saldo_awal_nilai = ? WHERE id = ?',
        [Number(tahun), Number(bulan), Number(saldo_awal_nilai || 0), Number(obat_id)]
      );
    }
    
    // Recalculate
    const { warnings } = await recalcObatChain(conn, Number(obat_id));
    
    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'Saldo awal tahunan berhasil disimpan.', warnings });
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
console.log("POST /api/obat/saldo-awal patched");
