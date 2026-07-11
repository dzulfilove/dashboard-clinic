import fs from 'fs';
let code = fs.readFileSync('src/db/connection.ts', 'utf8');

// Add missing virtual queries for recalcObatChain

// 1. SELECT * FROM obat_konsumsi_harian WHERE obat_id = ? ORDER BY tanggal ASC
const q1 = `
  if (norm.startsWith('SELECT * FROM obat_konsumsi_harian WHERE obat_id = ? ORDER BY tanggal ASC')) {
    if (!vdb.obat_konsumsi_harian) vdb.obat_konsumsi_harian = [];
    const oid = Number(params[0]);
    const filtered = vdb.obat_konsumsi_harian.filter((x: any) => x.obat_id === oid);
    filtered.sort((a: any, b: any) => String(a.tanggal).localeCompare(String(b.tanggal)));
    return filtered;
  }
`;
code = code.replace(
  /if \(norm\.startsWith\('SELECT c\.\*, o\.nama_obat, o\.kode_obat, o\.harga_satuan, o\.lead_time_hari, o\.golongan FROM obat_konsumsi_harian/,
  q1 + "\n  if (norm.startsWith('SELECT c.*, o.nama_obat, o.kode_obat, o.harga_satuan, o.lead_time_hari, o.golongan FROM obat_konsumsi_harian"
);

// 2. UPDATE obat_konsumsi_harian SET stok_awal = ?, sisa_stok = ? WHERE id = ?
const q2 = `
  if (norm.startsWith('UPDATE obat_konsumsi_harian SET stok_awal = ?, sisa_stok = ? WHERE id = ?')) {
    const [sawal, sisa, id] = params;
    if (!vdb.obat_konsumsi_harian) vdb.obat_konsumsi_harian = [];
    const idx = vdb.obat_konsumsi_harian.findIndex((x: any) => x.id === Number(id));
    if (idx !== -1) {
      vdb.obat_konsumsi_harian[idx].stok_awal = Number(sawal);
      vdb.obat_konsumsi_harian[idx].sisa_stok = Number(sisa);
      writeVirtualDb(vdb);
      return { affectedRows: 1 };
    }
    return { affectedRows: 0 };
  }
`;
code = code.replace(
  /if \(norm\.includes\('INSERT INTO obat_konsumsi_harian'\) && norm\.includes\('ON DUPLICATE KEY UPDATE'\)\) \{/,
  q2 + "\n  if (norm.includes('INSERT INTO obat_konsumsi_harian') && norm.includes('ON DUPLICATE KEY UPDATE')) {"
);

// 3. DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ? AND bulan = ? AND tahun = ?
const q3 = `
  if (norm.startsWith('DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ? AND bulan = ? AND tahun = ?')) {
    const [oid, b, t] = params;
    if (!vdb.obat_konsumsi_bulanan) vdb.obat_konsumsi_bulanan = [];
    vdb.obat_konsumsi_bulanan = vdb.obat_konsumsi_bulanan.filter((x: any) => !(x.obat_id === Number(oid) && x.bulan === Number(b) && x.tahun === Number(t)));
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }
`;
// 4. DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ?
const q4 = `
  if (norm.startsWith('DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ?')) {
    const oid = Number(params[0]);
    if (!vdb.obat_konsumsi_bulanan) vdb.obat_konsumsi_bulanan = [];
    vdb.obat_konsumsi_bulanan = vdb.obat_konsumsi_bulanan.filter((x: any) => x.obat_id !== oid);
    writeVirtualDb(vdb);
    return { affectedRows: 1 };
  }
`;
// 5. SELECT bulan, tahun FROM obat_konsumsi_bulanan WHERE obat_id = ?
const q5 = `
  if (norm.startsWith('SELECT bulan, tahun FROM obat_konsumsi_bulanan WHERE obat_id = ?')) {
    const oid = Number(params[0]);
    if (!vdb.obat_konsumsi_bulanan) vdb.obat_konsumsi_bulanan = [];
    return vdb.obat_konsumsi_bulanan.filter((x: any) => x.obat_id === oid).map((x: any) => ({ bulan: x.bulan, tahun: x.tahun }));
  }
`;
code = code.replace(
  /if \(norm\.includes\('INSERT INTO obat_konsumsi_bulanan'\) && norm\.includes\('ON DUPLICATE KEY UPDATE'\)\) \{/,
  q3 + "\n" + q4 + "\n" + q5 + "\n  if (norm.includes('INSERT INTO obat_konsumsi_bulanan') && norm.includes('ON DUPLICATE KEY UPDATE')) {"
);


fs.writeFileSync('src/db/connection.ts', code);
console.log('connection.ts patched');
