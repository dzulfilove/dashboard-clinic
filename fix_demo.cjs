const fs = require('fs');
let c = fs.readFileSync('src/pages/demografi/DemografiKunjungan.tsx', 'utf-8');
let cnt = 1;
const target = 'className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center space-x-4"';
c = c.replace(/initial=\{\{ opacity: 0, y: 10 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*transition=\{\{ duration: [0-9.]+, delay: [0-9.]+ \}\}/g, '');
c = c.replace(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
  return 'whileHover={{ y: -2 }}\n                  transition={{ duration: 0.15 }}\n                  className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl p-5 rounded-2xl border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex items-center space-x-4 relative overflow-hidden group transition-all anim-fade-up anim-delay-' + (cnt++) + '"';
});
fs.writeFileSync('src/pages/demografi/DemografiKunjungan.tsx', c);
