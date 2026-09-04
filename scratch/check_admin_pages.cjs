const fs = require('fs');
const path = require('path');

const dir = './src/pages/admin';
const files = fs.readdirSync(dir).filter(f => /\.(tsx|ts)$/.test(f));

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  const fileMatches = [];
  lines.forEach((l, idx) => {
    if ((l.includes('first_name') || l.includes('firstName')) && !l.includes('middle_name') && !l.includes('middleName')) {
      fileMatches.push(`  [L${idx + 1}] ${l.trim()}`);
    }
  });
  if (fileMatches.length > 0) {
    console.log(`\n=== ${f} (${fileMatches.length}) ===`);
    fileMatches.forEach(m => console.log(m));
  }
});
