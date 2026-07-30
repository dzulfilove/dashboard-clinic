const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/<div\}\}/g, '<div');
  code = code.replace(/<tr\}\}/g, '<tr');
  code = code.replace(/<div\}/g, '<div');
  code = code.replace(/<tr\}/g, '<tr');
  // and also there might be leftover whileHover, whileTap, transition properties
  code = code.replace(/\s+whileHover=\{[^}]+\}/g, '');
  code = code.replace(/\s+whileTap=\{[^}]+\}/g, '');
  code = code.replace(/\s+transition=\{[^}]+\}/g, '');
  
  fs.writeFileSync(file, code);
}
