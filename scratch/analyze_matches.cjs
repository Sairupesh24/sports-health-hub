const fs = require('fs');

const matches = JSON.parse(fs.readFileSync('./scratch/matches.json', 'utf8'));

// Group by file
const byFile = {};
matches.forEach(m => {
  const f = m.file.replace(/\\/g, '/');
  if (!byFile[f]) byFile[f] = [];
  byFile[f].push(m);
});

console.log(`Total files with candidate lines: ${Object.keys(byFile).length}`);
for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n=== ${file} (${items.length} occurrences) ===`);
  items.slice(0, 5).forEach(i => console.log(`  L${i.lineNum}: ${i.line}`));
}
