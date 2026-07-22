const fs = require('fs');

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Remove anim-fade-up from grid containers
  content = content.replace(/className="(grid[^"]*) anim-fade-up anim-delay-[0-9]+([^"]*)"/g, 'className="$1$2"');

  // 2. Ensure motion import
  const willReplace = content.includes('bg-gradient-to-br from-emerald-800/80');
  if (willReplace && !content.includes('motion/react')) {
    content = content.replace(/import React[^;]*;/, "$&\nimport { motion } from 'motion/react';");
  }

  // We want to transform the card container to:
  // <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all anim-fade-up anim-delay-X">

  // Find all cards by matching from-emerald-800/80
  // Instead of matching the whole HTML, let's just replace the exact class string, and ensure the tag is motion.div and has the right props.
  // We can do this by matching the opening tag until the `>` 
  let count = 1;
  const tagRegex = /<(div|motion\.div)[^>]*from-emerald-800\/80[^>]*>/g;

  content = content.replace(tagRegex, (match, tag) => {
    // If it was just <div, we need to replace its closing </div> later.
    // Wait, let's just use string replacement!
    const newClass = `bg-gradient-to-br from-emerald-800/80 to-teal-700/80 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group transition-all anim-fade-up anim-delay-${count++}`;
    
    // rebuild the tag
    return `<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }} className="${newClass}">`;
  });

  // Now, we changed <div to <motion.div, so we must find their corresponding closing tags!
  // Since we don't have a full AST, we can rely on the fact that these cards end with:
  // <div className="absolute bottom-0 inset-x-0 h-1 bg-white/40"></div>
  // followed by </div> or </motion.div>
  const closingRegex = /<div\s+className="absolute bottom-0 inset-x-0 h-1 bg-white\/40"><\/div>\s*<\/(div|motion\.div)>/g;
  content = content.replace(closingRegex, '<div className="absolute bottom-0 inset-x-0 h-1 bg-white/40"></div>\n                    </motion.div>');

  // Let's also remove `whileHover={{ y: -2 }}` if it existed before so we don't have duplicates
  // But wait, my regex replaced the ENTIRE opening tag, so previous props are lost!
  // Wait, if I replace the entire tag, I lose `key={...}` or other props!
  // Let's check if they have keys or anything important.

});
"
