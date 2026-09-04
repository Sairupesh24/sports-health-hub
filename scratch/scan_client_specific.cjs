const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'generated' || file === 'scratch') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src');
const results = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for client or athlete name rendering
    if (
      (line.includes('client') || line.includes('athlete') || line.includes('patient') || line.includes('c.') || line.includes('a.') || line.includes('item.') || line.includes('row.') || line.includes('session.')) &&
      (line.includes('first_name') || line.includes('firstName')) &&
      !line.includes('middle_name') && !line.includes('middleName')
    ) {
      results.push({
        file: f.replace(/\\/g, '/'),
        lineNum: idx + 1,
        line: line.trim()
      });
    }
  });
});

console.log(`Found ${results.length} lines involving client/athlete first_name without middle_name.`);
fs.writeFileSync('./scratch/client_specific_matches.json', JSON.stringify(results, null, 2));

const byFile = {};
results.forEach(r => {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
});

console.log(`Files count: ${Object.keys(byFile).length}`);
for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n=== ${file} (${items.length}) ===`);
  items.forEach(it => console.log(`  [L${it.lineNum}] ${it.line}`));
}
