const fs = require('fs');
let c = fs.readFileSync('src/pages/pelayanan/RawatJalan.tsx', 'utf-8');
const search = '      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">';
const replace = `      {/* TAB CONTENT WITH ANIMATION */}
      <AnimatePresence mode="wait">
        {activeTab === 'statistik' && (
          <motion.div
            key="statistik"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">`;
c = c.replace(search, replace);
fs.writeFileSync('src/pages/pelayanan/RawatJalan.tsx', c);
