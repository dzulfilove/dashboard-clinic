const fs = require('fs');
let c = fs.readFileSync('src/pages/pelayanan/RawatJalan.tsx', 'utf-8');
c = c.replace(/<\/motion\.div>\n\s*\)\}\n\s*<\/div>\n\s*\)\}\n\s*<\/div>/, '</motion.div>\n          )}\n        </AnimatePresence>\n      </div>\n    </div>');
fs.writeFileSync('src/pages/pelayanan/RawatJalan.tsx', c);
