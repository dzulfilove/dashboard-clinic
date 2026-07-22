const fs = require('fs');
let c = fs.readFileSync('src/pages/pelayanan/RawatJalan.tsx', 'utf-8');

// 1. Fix line 1345: unexpected closing div does not match opening motion.div
c = c.replace(/<\/div>\n(\s*)\}\)\n(\s*){\/\* TAB 2/g, '</motion.div>\n$1})\n$2{/* TAB 2');

// Wait, the error is at line 1345:
// 1343|                      </div>
// 1344|                    </motion.div>
// 1345|                  </div>
// 1346|                )}
c = c.replace(/<\/motion\.div>\n\s*<\/div>\n\s*\}\)/g, '</motion.div>\n                </motion.div>\n              )}');

// 2. Fix line 2000: missing closing div for isParsed true branch
c = c.replace(/<\/button>\n\s*<\/div>\n\s*\) : \(/g, '</button>\n                    </div>\n                  </div>\n                ) : (');

fs.writeFileSync('src/pages/pelayanan/RawatJalan.tsx', c);
