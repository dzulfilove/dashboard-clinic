const fs = require('fs');
let c = fs.readFileSync('src/pages/lab/DashboardLab.tsx', 'utf-8');
c = c.replace(/initial=\{\{ opacity: 0, y: 10 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*transition=\{\{ duration: [0-9.]+, delay: [0-9.]+ \}\}\n\s*whileHover=\{\{ y: -4, scale: 1\.01, boxShadow: '0 12px 30px rgba\\(0,0,0,0\\.12\\)' \}\}/g, '');
c = c.replace(/whileHover=\{\{ y: -4, scale: 1\.01, boxShadow: '0 12px 30px rgba\\(0,0,0,0\\.12\\)' \}\}\n\s*transition=\{\{ duration: [0-9.]+ \}\}/g, '');

let cnt = 1;
const target1 = 'className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-sm relative overflow-hidden group transition-all"';
c = c.replace(new RegExp(target1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
  return 'whileHover={{ y: -2 }}\n              transition={{ duration: 0.15 }}\n              className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all anim-fade-up anim-delay-' + (cnt++) + '"';
});

const target2 = 'className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-sm relative overflow-hidden group transition-all sm:col-span-2"';
c = c.replace(new RegExp(target2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
  return 'whileHover={{ y: -2 }}\n              transition={{ duration: 0.15 }}\n              className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all sm:col-span-2 anim-fade-up anim-delay-' + (cnt++) + '"';
});

fs.writeFileSync('src/pages/lab/DashboardLab.tsx', c);
