import fs from 'fs';
import path from 'path';

function findFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findFiles(filePath, files);
    } else if (filePath.endsWith('.tsx') && !filePath.includes('SearchableSelect.tsx')) {
      files.push(filePath);
    }
  }
  return files;
}

const allFiles = findFiles('./src/pages');
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  
  // if it has <select
  if (content.includes('<select')) {
    // Determine relative path to src/components/SearchableSelect.js
    // file is like src/pages/pelayanan/IGD.tsx
    const parts = file.split(path.sep); // e.g. ['src', 'pages', 'pelayanan', 'IGD.tsx']
    const depth = parts.length - 2; // -1 for filename, -1 for src
    let prefix = '';
    for(let i=0; i<depth; i++) prefix += '../';
    if(prefix === '') prefix = './';
    
    const importStatement = `import { SearchableSelect } from '${prefix}components/SearchableSelect.js';\n`;
    
    // Add import statement at the beginning of the file (after other imports)
    if (!content.includes('SearchableSelect')) {
       // Just put it after the first import
       content = content.replace(/import [^\n]+;\n/, match => match + importStatement);
    }
    
    // Replace <select ... > with <SearchableSelect ... >
    // Be careful with newlines
    content = content.replace(/<select/g, '<SearchableSelect');
    content = content.replace(/<\/select>/g, '</SearchableSelect>');
    
    fs.writeFileSync(file, content);
    console.log('Modified', file);
  }
}
