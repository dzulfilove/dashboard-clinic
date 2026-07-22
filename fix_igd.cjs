const fs = require('fs');
['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatInap.tsx'].forEach(file => {
  let c = fs.readFileSync(file, 'utf-8');
  let cnt = 1;
  const target = 'className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-sm relative overflow-hidden group transition-all"';
  c = c.replace(/initial=\{\{ opacity: 0, y: 10 \}\}\n\s*animate=\{\{ opacity: 1, y: 0 \}\}\n\s*transition=\{\{ duration: [0-9.]+, delay: [0-9.]+ \}\}\n\s*whileHover=\{\{ y: -4, scale: 1\.01, boxShadow: '0 12px 30px rgba\\(0,0,0,0\\.12\\)' \}\}/g, '');
  
  c = c.replace(new RegExp(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
    return 'whileHover={{ y: -2 }}\n                      transition={{ duration: 0.15 }}\n                      className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all anim-fade-up anim-delay-' + (cnt++) + '"';
  });
  fs.writeFileSync(file, c);
});
