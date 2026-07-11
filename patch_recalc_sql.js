import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /'SELECT saldo_awal_nilai, nama_obat FROM obat_master WHERE id = \?'/g,
  "'SELECT * FROM obat_master WHERE id = ?'"
);

fs.writeFileSync('server.ts', code);
console.log("SQL changed");
