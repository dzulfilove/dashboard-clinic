const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/<div\}\}\}/g, '<div');
  fs.writeFileSync(file, code);
}
