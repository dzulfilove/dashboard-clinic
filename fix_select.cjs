const fs = require('fs');
let code = fs.readFileSync('src/components/SearchableSelect.tsx', 'utf8');

code = code.replace(
  'interface SearchableSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}',
  'interface SearchableSelectProps extends SelectHTMLAttributes<HTMLSelectElement> { optionsList?: { value: string, label: string }[]; }'
);

fs.writeFileSync('src/components/SearchableSelect.tsx', code);
