import fs from 'fs';
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(
  /plugins: \[react\(\), tailwindcss\(\)\],/g,
  `plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-select', 'react-select/async-creatable', '@emotion/react']
    },`
);
content = content.replace(
  /resolve: \{\s*alias: \{\s*'@': path\.resolve\(__dirname, '\.'\),\s*\},\s*\},/g,
  ''
);
fs.writeFileSync('vite.config.ts', content);
