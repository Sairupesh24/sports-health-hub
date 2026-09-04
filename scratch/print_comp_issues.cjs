const fs = require('fs');

const issues = JSON.parse(fs.readFileSync('./scratch/client_specific_matches.json', 'utf8'));

const compIssues = issues.filter(i => i.file.startsWith('src/components/'));

const byFile = {};
compIssues.forEach(i => {
  if (!byFile[i.file]) byFile[i.file] = [];
  byFile[i.file].push(i);
});

console.log(`Total component files: ${Object.keys(byFile).length}, Total lines: ${compIssues.length}`);

for (const [f, items] of Object.entries(byFile)) {
  console.log(`\n=== ${f} (${items.length}) ===`);
  items.forEach(it => {
    console.log(`  [L${it.lineNum}] ${it.line}`);
  });
}
