const fs = require('fs');

const issues = JSON.parse(fs.readFileSync('./scratch/client_name_issues.json', 'utf8'));

const srcIssues = issues.filter(i => i.file.startsWith('src/'));

const byFile = {};
srcIssues.forEach(i => {
  if (!byFile[i.file]) byFile[i.file] = [];
  byFile[i.file].push(i);
});

console.log(`Total src files: ${Object.keys(byFile).length}, Total lines: ${srcIssues.length}`);

for (const [f, items] of Object.entries(byFile)) {
  console.log(`\n=== ${f} (${items.length}) ===`);
  items.forEach(it => {
    console.log(`  L${it.lineNum}: ${it.line}`);
  });
}
