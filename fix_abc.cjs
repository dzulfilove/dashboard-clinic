const fs = require('fs');

let c = fs.readFileSync('src/pages/farmasi/AbcAnalysis.tsx', 'utf-8');
c = c.replace(/Anggaran: Rp \{classASpend\.toLocaleString\('id-ID', \{ maximumFractionDigits: 0 \}\)\} \(\{totalInvestasi > 0 \? Math\.round\(\(classASpend\/totalInvestasi\)\*100\) : 0\}%\)\n\s*<\/p>\n\s*<\/div>/, (match) => match.replace('</div>', '</motion.div>'));
c = c.replace(/Anggaran: Rp \{classBSpend\.toLocaleString\('id-ID', \{ maximumFractionDigits: 0 \}\)\} \(\{totalInvestasi > 0 \? Math\.round\(\(classBSpend\/totalInvestasi\)\*100\) : 0\}%\)\n\s*<\/p>\n\s*<\/div>/, (match) => match.replace('</div>', '</motion.div>'));
c = c.replace(/Anggaran: Rp \{classCSpend\.toLocaleString\('id-ID', \{ maximumFractionDigits: 0 \}\)\} \(\{totalInvestasi > 0 \? Math\.round\(\(classCSpend\/totalInvestasi\)\*100\) : 0\}%\)\n\s*<\/p>\n\s*<\/div>/, (match) => match.replace('</div>', '</motion.div>'));

// Also I previously replaced all </motion.div> to </div> which broke my <motion.div from the opening tag!
// But wait, the opening tags are still <motion.div. So only the closing tags need to be fixed!
fs.writeFileSync('src/pages/farmasi/AbcAnalysis.tsx', c);

let c2 = fs.readFileSync('src/pages/farmasi/Forecasting.tsx', 'utf-8');
// Forecasting also had opening tags modified!
// Let's check its build errors. Oh wait, I didn't see forecasting build errors.
