const fs = require('fs');
let c = fs.readFileSync('src/pages/pelayanan/RawatJalan.tsx', 'utf-8');

const regex = /\{feedback && \(\s*<motion\.div\s*whileHover=\{\{ y: -2 \}\}\s*transition=\{\{ duration: 0\.15 \}\}\s*className="bg-gradient-to-br from-emerald-800\/80 to-teal-700\/80 backdrop-blur-xl rounded-2xl p-5 border border-white\/20 shadow-\[0_8px_30px_rgb\(0,0,0,0\.12\)\] relative overflow-hidden group transition-all anim-fade-up anim-delay-1"\s*>/;

const replacement = `{feedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={\`fixed bottom-6 right-6 px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 z-50 \${
              feedback.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }\`}
          >
            {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-rose-600" />}
            <span className="text-sm font-medium">{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="ml-2 hover:bg-black/5 p-1 rounded-lg transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Total Kunjungan */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all anim-fade-up anim-delay-1"
        >`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/pages/pelayanan/RawatJalan.tsx', c);
