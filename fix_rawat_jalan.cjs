const fs = require('fs');
let code = fs.readFileSync('src/pages/pelayanan/RawatJalan.tsx', 'utf8');

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

const toReplace = `<SearchableSelect
                          value={icdKode}
                          onChange={(e) => setIcdKode(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all"
                          required
                        >
                          <option value="">-- Pilih Diagnosis --</option>
                          {icdList.map(icd => <option key={icd.id} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>)}
                        </SearchableSelect>`;
const replacement = `<SearchableSelect
                          value={icdKode}
                          onChange={(e) => setIcdKode(e.target.value)}
                          className="mt-1.5 block w-full px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl text-xs focus:ring-4 focus:ring-teal-500/5 focus:outline-none focus:bg-white transition-all"
                          required
                          optionsList={icdOptionsList}
                        />`;
code = code.replace(toReplace, replacement);

fs.writeFileSync('src/pages/pelayanan/RawatJalan.tsx', code);
