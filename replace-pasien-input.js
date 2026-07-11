import fs from 'fs';

const filesToPatch = [
  'src/pages/pelayanan/RawatJalan.tsx',
  'src/pages/pelayanan/RawatInap.tsx',
  'src/pages/pelayanan/IGD.tsx'
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Import AsyncPasienSelect
  if (!content.includes('AsyncPasienSelect')) {
    content = content.replace(
      /import { SearchableSelect } from '\.\.\/\.\.\/components\/SearchableSelect\.js';/,
      "import { SearchableSelect } from '../../components/SearchableSelect.js';\nimport { AsyncPasienSelect } from '../../components/AsyncPasienSelect.js';"
    );
  }

  // 2. We need a state for the selected option in the component
  // e.g. const [selectedPasienOption, setSelectedPasienOption] = useState<any>(null);
  if (!content.includes('selectedPasienOption')) {
    content = content.replace(
      /const \[noRm, setNoRm\] = useState\(''\);/,
      "const [noRm, setNoRm] = useState('');\n  const [selectedPasienOption, setSelectedPasienOption] = useState<any>(null);"
    );
  }

  // 3. Replace the `noRm` input with AsyncPasienSelect
  // We'll look for the No. Rekam Medis (RM) label and its input block
  const rmInputRegex = /<label className="block text-xs font-(?:medium|extrabold) text-slate-[56]00 uppercase tracking-wider">No\. Rekam Medis \(RM\)<\/label>\s*<input[^>]*value={noRm}[^>]*\/>/s;
  
  const replacement = `<label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Pencarian / No. Rekam Medis (RM)</label>
                        <AsyncPasienSelect
                          value={selectedPasienOption}
                          onChange={(option: any) => {
                            setSelectedPasienOption(option);
                            if (option) {
                              if (option.__isNew__) {
                                setNoRm(option.value);
                                setNamaPasien('');
                                setIsNewPatient(true);
                              } else {
                                setNoRm(option.value);
                                setNamaPasien(option.pasien?.nama || '');
                                setIsNewPatient(false);
                              }
                            } else {
                              setNoRm('');
                              setNamaPasien('');
                              setIsNewPatient(false);
                            }
                          }}
                          disabled={isEditMode}
                          className="mt-1.5"
                          required
                        />`;

  content = content.replace(rmInputRegex, replacement);

  // 4. Update the resetForm function to also clear selectedPasienOption
  // Look for setNoRm(''); inside resetManualForm
  content = content.replace(
    /setNoRm\(''\);/,
    "setNoRm('');\n    setSelectedPasienOption(null);"
  );

  // 5. In handleEdit, we need to populate selectedPasienOption
  // setNoRm(data.no_rm || '');
  content = content.replace(
    /setNoRm\(data\.no_rm \|\| ''\);/,
    "setNoRm(data.no_rm || '');\n    if (data.no_rm) setSelectedPasienOption({ value: data.no_rm, label: `${data.no_rm} - ${data.nama_pasien}`, pasien: { nama: data.nama_pasien, no_rm: data.no_rm } });"
  );

  // 6. We should probably remove the useEffect that auto-checks patient
  // We can just comment it out
  const useEffectRegex = /useEffect\(\(\) => \{\s*if \(isEditMode\).*?const timer = setTimeout.*?try \{.*?const res = await api\.get\('\/pasien'.*?catch \(err\).*?\}, 500\);\s*return \(\) => clearTimeout\(timer\);\s*\}, \[noRm, isEditMode\]\);/s;
  content = content.replace(useEffectRegex, '/* useEffect for patient auto-check removed */');

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}
