const fs = require('fs');

const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Strip motion props from all divs and trs
  code = code.replace(/\s+initial=\{[^}]+\}/g, '');
  code = code.replace(/\s+initial="[^"]+"/g, '');
  code = code.replace(/\s+animate=\{[^}]+\}/g, '');
  code = code.replace(/\s+animate="[^"]+"/g, '');
  code = code.replace(/\s+exit=\{[^}]+\}/g, '');
  code = code.replace(/\s+exit="[^"]+"/g, '');
  code = code.replace(/\s+variants=\{[^}]+\}/g, '');
  code = code.replace(/\s+custom=\{[^}]+\}/g, '');
  code = code.replace(/<AnimatePresence[^>]*>/g, '');
  code = code.replace(/<\/AnimatePresence>/g, '');

  fs.writeFileSync(file, code);
}
