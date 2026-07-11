import fs from 'fs';

const filesToPatch = [
  'src/pages/pelayanan/RawatJalan.tsx',
  'src/pages/pelayanan/RawatInap.tsx',
  'src/pages/pelayanan/IGD.tsx'
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace the `noRm` input block
  const rmInputRegex = /<label className="[^"]*">No\. Rekam Medis \(RM\)<\/label>\s*<input[\s\S]*?value=\{noRm\}[\s\S]*?\/>/s;
  
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

  if (rmInputRegex.test(content)) {
      content = content.replace(rmInputRegex, replacement);
      fs.writeFileSync(file, content);
      console.log('Patched input in', file);
  } else {
      console.log('Regex did not match in', file);
  }
}
