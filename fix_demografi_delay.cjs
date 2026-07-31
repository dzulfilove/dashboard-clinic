const fs = require('fs');
const file = 'src/pages/demografi/DemografiKunjungan.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const cardVariants = \{[\s\S]*?\};\s*const chartCardVariants = \{[\s\S]*?\};/,
  `const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay: i * 0.15 } }),
    hover: { y: -4, scale: 1.02, transition: { duration: 0.2 } },
  };

  const chartCardVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({ opacity: 1, transition: { duration: 0.5, ease: "easeOut", delay: i * 0.15 } }),
    hover: { y: -2, transition: { duration: 0.2 } },
  };`
);

fs.writeFileSync(file, content);
