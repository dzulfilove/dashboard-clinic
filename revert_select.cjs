const fs = require('fs');
let code = fs.readFileSync('src/components/SearchableSelect.tsx', 'utf8');

code = code.replace(
  "import WindowedSelect from 'react-windowed-select';",
  "import Select from 'react-select';"
);
code = code.replace(
  "<WindowedSelect",
  "<Select"
);

fs.writeFileSync('src/components/SearchableSelect.tsx', code);
