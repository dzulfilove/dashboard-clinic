const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Find where it's {isManualModalOpen && ( ... )} inside createPortal
  code = code.replace(/\{createPortal\(\s*\{isManualModalOpen && \(/g, '{createPortal(\n        <>\n          {isManualModalOpen && (');
  code = code.replace(/\{createPortal\(\s*\{activeTab === 'input' && \(/g, '{createPortal(\n        <>\n          {activeTab === \'input\' && (');
  
  // Find the closing part:
  //        )}
  //      ,
  //      document.body
  //    )}
  code = code.replace(/\)\}\s*,\s*document\.body/g, ')}\n        </>,\n        document.body');
  code = code.replace(/\)\}\s*,\s*typeof document/g, ')}\n        </>,\n        typeof document');

  fs.writeFileSync(file, code);
}
