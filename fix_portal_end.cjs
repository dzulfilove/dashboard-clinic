const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Revert createPortal changes to clean them up
  code = code.replace(/\{createPortal\( <>/g, '{createPortal(');
  code = code.replace(/\)\}<\/>,\s*typeof document/g, ')},\n      typeof document');
  
  // If we ended up with weird things at the end of the file like `, document.body )}`
  // Let's just fix it by matching the modal ends.
  
  fs.writeFileSync(file, code);
}
