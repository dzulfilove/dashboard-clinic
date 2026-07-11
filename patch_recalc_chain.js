import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const recalcFunc = `
// HELPER: Recalculate daily and monthly stock chain for a given obat_id
async function recalcObatChain(conn: any, obat_id: number): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];

  // 1. Get initial master balance
  const [masterRows] = await conn.query('SELECT saldo_awal_nilai, nama_obat FROM obat_master WHERE id = ?', [obat_id]);
  if (!masterRows || masterRows.length === 0) return { warnings };
  const m = masterRows[0];
  const saldo_awal_nilai = Number(m.saldo_awal_nilai) || 0;
  const nama_obat = m.nama_obat || 'Unknown';

  // 2. Fetch all daily records ordered by tanggal ASC
  const [harianRows] = await conn.query('SELECT * FROM obat_konsumsi_harian WHERE obat_id = ? ORDER BY tanggal ASC', [obat_id]);
  
  if (harianRows.length === 0) {
    // If no daily rows, delete all monthly records for this drug to prevent orphaned aggregates
    await conn.query('DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ?', [obat_id]);
    return { warnings };
  }

  // 3. Iterate and recalculate
  let runningSisa = saldo_awal_nilai;
  const monthYears = new Set<string>();

  for (const row of harianRows) {
    const penerimaan = Number(row.penerimaan) || 0;
    const pemakaian = Number(row.pemakaian) || 0;
    const retur_hilang = Number(row.retur_hilang) || 0;
    
    const stok_awal = runningSisa;
    const sisa_stok = stok_awal + penerimaan - pemakaian - retur_hilang;
    
    if (sisa_stok < 0) {
      warnings.push(\`Stok \${nama_obat} menjadi negatif (\${sisa_stok}) pada \${new Date(row.tanggal).toISOString().split('T')[0]}\`);
    }

    if (Number(row.stok_awal) !== stok_awal || Number(row.sisa_stok) !== sisa_stok) {
      await conn.query(
        'UPDATE obat_konsumsi_harian SET stok_awal = ?, sisa_stok = ? WHERE id = ?',
        [stok_awal, sisa_stok, row.id]
      );
    }
    
    runningSisa = sisa_stok;
    
    // track unique month-year
    const d = new Date(row.tanggal);
    const mStr = (d.getMonth() + 1).toString() + '-' + d.getFullYear().toString();
    monthYears.add(mStr);
  }

  // 4. Check for potential duplicate receipts (basic heuristic: same large receipt on adjacent days)
  for (let i = 1; i < harianRows.length; i++) {
    const r1 = harianRows[i-1];
    const r2 = harianRows[i];
    if (r1.penerimaan > 0 && r1.penerimaan === r2.penerimaan) {
      const d1 = new Date(r1.tanggal);
      const d2 = new Date(r2.tanggal);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 3) {
        warnings.push(\`Dugaan penerimaan ganda (\${r1.penerimaan}) untuk \${nama_obat} pada \${d1.toISOString().split('T')[0]} & \${d2.toISOString().split('T')[0]}\`);
      }
    }
  }

  // 5. Rebuild monthly aggregated rows
  // Clear months that are no longer valid for this drug
  const validMy = Array.from(monthYears);
  if (validMy.length > 0) {
    // A bit manual because of month-year mapping
    // We can just fetch current monthly and delete those not in validMy
    const [currentBulanan] = await conn.query('SELECT bulan, tahun FROM obat_konsumsi_bulanan WHERE obat_id = ?', [obat_id]);
    for (const b of currentBulanan) {
      const myStr = b.bulan + '-' + b.tahun;
      if (!monthYears.has(myStr)) {
         await conn.query('DELETE FROM obat_konsumsi_bulanan WHERE obat_id = ? AND bulan = ? AND tahun = ?', [obat_id, b.bulan, b.tahun]);
      }
    }
  }

  // Aggregate daily to monthly
  for (const my of monthYears) {
    const [mm, yyyy] = my.split('-');
    const month = parseInt(mm);
    const year = parseInt(yyyy);

    const [harianBulan] = await conn.query(
      'SELECT * FROM obat_konsumsi_harian WHERE obat_id = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ? ORDER BY tanggal ASC',
      [obat_id, month, year]
    );

    if (harianBulan.length > 0) {
      // The row's stok_awal is the updated one from the iteration above
      const monthly_stok_awal = harianBulan[0].stok_awal;
      let sumPenerimaan = 0;
      let sumPemakaian = 0;
      let sumRetur = 0;
      for (const r of harianBulan) {
        sumPenerimaan += Number(r.penerimaan) || 0;
        sumPemakaian += Number(r.pemakaian) || 0;
        sumRetur += Number(r.retur_hilang) || 0;
      }
      const monthly_sisa_stok = monthly_stok_awal + sumPenerimaan - sumPemakaian - sumRetur;
      
      // we don't have input_by from recalc strictly for monthly, but we can reuse the last row's
      const lastRow = harianBulan[harianBulan.length - 1];
      const input_by = lastRow.input_by;

      await conn.query(
        \`INSERT INTO obat_konsumsi_bulanan (obat_id, bulan, tahun, stok_awal, penerimaan, pemakaian, retur_hilang, sisa_stok, input_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE stok_awal = VALUES(stok_awal), penerimaan = VALUES(penerimaan), pemakaian = VALUES(pemakaian), retur_hilang = VALUES(retur_hilang), sisa_stok = VALUES(sisa_stok), input_by = VALUES(input_by)\`,
        [obat_id, month, year, monthly_stok_awal, sumPenerimaan, sumPemakaian, sumRetur, monthly_sisa_stok, input_by]
      );
    }
  }

  return { warnings };
}
`;

if (!code.includes('async function recalcObatChain')) {
  // Insert before the endpoint
  code = code.replace(/app\.post\('\/api\/obat\/konsumsi'/, recalcFunc + '\napp.post(\'/api/obat/konsumsi\'');
  fs.writeFileSync('server.ts', code);
  console.log("recalcObatChain added");
}

