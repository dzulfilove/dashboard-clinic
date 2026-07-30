const fs = require('fs');
let code = fs.readFileSync('src/pages/pelayanan/RawatInap.tsx', 'utf8');

const icdOptionsListMasukStr = `
  const icdOptionsListMasuk = useMemo(() => {
    return [
      { value: '', label: '- Pilih Diagnosa Masuk -' },
      ...icdList.map((icd: any) => ({
        value: icd.kode_icd,
        label: icd.kode_icd + ' - ' + icd.deskripsi
      }))
    ];
  }, [icdList]);

  const icdOptionsListPulang = useMemo(() => {
    return [
      { value: '', label: '- Pilih Diagnosa Pulang -' },
      ...icdList.map((icd: any) => ({
        value: icd.kode_icd,
        label: icd.kode_icd + ' - ' + icd.deskripsi
      }))
    ];
  }, [icdList]);
`;

code = code.replace(
  'const icdOptions = useMemo(() => {',
  icdOptionsListMasukStr + '\n  const icdOptions = useMemo(() => {'
);

const toReplaceMasuk = `<SearchableSelect
                      value={icdMasuk}
                      onChange={(e) => setIcdMasuk(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                    >
                      <option value="">- Pilih Diagnosa Masuk -</option>
                      {icdList.map((icd, i) => (
                        <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                      ))}
                    </SearchableSelect>`;
const replacementMasuk = `<SearchableSelect
                      value={icdMasuk}
                      onChange={(e) => setIcdMasuk(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      optionsList={icdOptionsListMasuk}
                    />`;
code = code.replace(toReplaceMasuk, replacementMasuk);

const toReplacePulang = `<SearchableSelect
                      value={icdPulang}
                      onChange={(e) => setIcdPulang(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                    >
                      <option value="">- Pilih Diagnosa Pulang -</option>
                      {icdList.map((icd, i) => (
                        <option key={i} value={icd.kode_icd}>{icd.kode_icd} - {icd.deskripsi}</option>
                      ))}
                    </SearchableSelect>`;
const replacementPulang = `<SearchableSelect
                      value={icdPulang}
                      onChange={(e) => setIcdPulang(e.target.value)}
                      className="mt-1.5 block w-full px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:outline-none focus:bg-white"
                      optionsList={icdOptionsListPulang}
                    />`;
code = code.replace(toReplacePulang, replacementPulang);

fs.writeFileSync('src/pages/pelayanan/RawatInap.tsx', code);
