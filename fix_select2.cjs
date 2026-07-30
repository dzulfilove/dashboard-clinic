const fs = require('fs');
let code = fs.readFileSync('src/components/SearchableSelect.tsx', 'utf8');

code = code.replace(
  "import Select from 'react-select';",
  "import WindowedSelect from 'react-windowed-select';"
);
code = code.replace(
  "<Select",
  "<WindowedSelect"
);
code = code.replace(
  "windowThreshold={50}",
  ""
);

fs.writeFileSync('src/components/SearchableSelect.tsx', code);
