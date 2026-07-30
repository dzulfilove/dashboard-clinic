const fs = require('fs');
const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  
  // Find where it says:
  // ) : (
  //   {activeTab ===
  // and insert <>
  code = code.replace(/\) :\ \(\s*\{activeTab ===/g, ') : (<>\n        {activeTab ===');
  
  // The closing for ) : ( was:
  //   )}
  // </AnimatePresence>
  // But now AnimatePresence is gone, so it's just:
  //   )}
  // )
  // Wait, let's just use regex to find where to put </>.
  // It's probably easier to look for the end of the input tab.
  code = code.replace(/\{activeTab === 'input' && \(([\s\S]*?)\n\s*\)\}\s*\n\s*\)/g, '{activeTab === \'input\' && ($1\n          )}\n        </>\n      )');

  fs.writeFileSync(file, code);
}
