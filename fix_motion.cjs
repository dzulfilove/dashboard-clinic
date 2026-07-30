const fs = require('fs');

const files = ['src/pages/pelayanan/IGD.tsx', 'src/pages/pelayanan/RawatJalan.tsx', 'src/pages/pelayanan/RawatInap.tsx'];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Replace all remaining motion tags
  code = code.replace(/<motion\.div/g, '<div');
  code = code.replace(/<\/motion\.div>/g, '</div>');
  
  code = code.replace(/<motion\.tr/g, '<tr');
  code = code.replace(/<\/motion\.tr>/g, '</tr>');
  
  code = code.replace(/<motion\.td/g, '<td');
  code = code.replace(/<\/motion\.td>/g, '</td>');

  fs.writeFileSync(file, code);
}
