const fs = require('fs');
let code = fs.readFileSync('src/pages/pelayanan/IGD.tsx', 'utf8');

const icdOptionsListStr = `
  const icdOptionsList = useMemo(() => {
    return [
      { value: '', label: '-- Pilih Diagnosis --' },
      ...icdList.map((icd: any) => ({
        value: icd.kode_icd,
        label: icd.kode_icd + ' - ' + icd.deskripsi
      }))
    ];
  }, [icdList]);
`;

code = code.replace(
  'const icdOptions = useMemo(() => {',
  icdOptionsListStr + '\n  const icdOptions = useMemo(() => {'
);

code = code.replace(
  '<SearchableSelect\n                          value={icdKode}\n                          onChange={(e) => setIcdKode(e.target.value)}\n                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"\n                        >\n                          <option value="">-- Pilih Diagnosis --</option>\n                          {icdList.map(icd => <option key={icd.id} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>)}\n                        </SearchableSelect>',
  '<SearchableSelect\n                          value={icdKode}\n                          onChange={(e) => setIcdKode(e.target.value)}\n                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"\n                          optionsList={icdOptionsList}\n                        />'
);

fs.writeFileSync('src/pages/pelayanan/IGD.tsx', code);
