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

const allFiles = findFiles('./src/components');
for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('<select')) {
    const importStatement = `import { SearchableSelect } from './SearchableSelect.js';\n`;
    
    if (!content.includes('SearchableSelect')) {
       content = content.replace(/import [^\n]+;\n/, match => match + importStatement);
    }
    
    content = content.replace(/<select/g, '<SearchableSelect');
    content = content.replace(/<\/select>/g, '</SearchableSelect>');
    
    fs.writeFileSync(file, content);
    console.log('Modified', file);
  }
}
