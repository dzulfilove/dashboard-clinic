const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/key="statistik"\}/g, 'key="statistik"');
  code = code.replace(/key="input"\}/g, 'key="input"');
  code = code.replace(/<tr\}/g, '<tr');
  fs.writeFileSync(file, code);
}
