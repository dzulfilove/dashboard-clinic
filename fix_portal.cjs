const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // {createPortal( {isManualModalOpen
  code = code.replace(/\{createPortal\(\s*\{isManualModalOpen/g, '{createPortal( <>{isManualModalOpen');
  code = code.replace(/\{createPortal\(\s*\{activeTab ===/g, '{createPortal( <>{activeTab ===');

  // And the closing for it: it used to be )}, document.body)} but now it might be missing a </>.
  // Actually if we look at RawatJalan.tsx it's probably )}, typeof document...
  code = code.replace(/\)\}\s*,\s*typeof document/g, ')}</>, typeof document');
  
  fs.writeFileSync(file, code);
}
