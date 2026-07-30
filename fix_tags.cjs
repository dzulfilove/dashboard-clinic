const fs = require('fs');

function fixFile(filename) {
  let code = fs.readFileSync(filename, 'utf8');
  
  // 1. Remove the misplaced fragment inside tbody
  code = code.replace(/<tbody className="divide-y divide-slate-100 text-xs text-slate-700">\s*<>/g, '<tbody className="divide-y divide-slate-100 text-xs text-slate-700">');
  
  // 2. We need to balance the divs for activeTab
  // Let's manually replace the ending of the tabs block
  // We know "TAB 3: PASTE TEXT BULK IMPORTER" is right after the kunjungan tab
  code = code.replace(/(\s*)\}\)\}\s*<button[^>]*>[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}\s*<\/div>\s*\)\}/, 
    (match) => {
      // We know there's a pagination block ending here.
      return match.replace(/<\/div>\s*\)\}\s*<\/div>\s*\)\}/, '</div>\n              )}');
    });

  // Let's just fix RawatJalan using a robust method.
  
  fs.writeFileSync(filename, code);
}
// Actually, let's just use regex to fix RawatJalan
