const fs = require('fs');

const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Strip AnimatePresence wrappers around the map
  code = code.replace(/<AnimatePresence>(\s*{paginatedRecords\.map\([^]+?)<\/AnimatePresence>/g, '$1');
  
  // Replace motion.tr with tr and strip motion props
  code = code.replace(/<motion\.tr\s+variants=\{[^}]+\}\s+initial="[^"]+"\s+animate="[^"]+"\s+exit="[^"]+"\s+custom=\{[^}]+\}/g, '<tr');
  code = code.replace(/<\/motion\.tr>/g, '</tr>');
  
  // Replace motion.div with div and strip motion props for paginatedRecords.map
  code = code.replace(/<motion\.div\s+key=\{[^}]+\}\s+variants=\{[^}]+\}\s+initial="[^"]+"\s+animate="[^"]+"\s+exit="[^"]+"\s+custom=\{[^}]+\}/g, (match) => {
    const keyMatch = match.match(/key=\{[^}]+\}/);
    return `<div ${keyMatch ? keyMatch[0] : ''}`;
  });
  
  // Replace the remaining motion.div ends
  code = code.replace(/<\/motion\.div>/g, '</div>');
  
  // Replace any other motion.div that might have variants (like empty states)
  code = code.replace(/<motion\.div\s+variants=\{[^}]+\}\s+initial="[^"]+"\s+animate="[^"]+"\s+exit="[^"]+"/g, '<div');
  
  fs.writeFileSync(file, code);
}
