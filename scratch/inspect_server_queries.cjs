const fs = require('fs');
const path = require('path');

const serverDir = './server';
const serverFiles = fs.readdirSync(serverDir).filter(f => f.endsWith('.js'));

serverFiles.forEach(f => {
  const content = fs.readFileSync(path.join(serverDir, f), 'utf8');
  const lines = content.split('\n');
  const hits = [];
  lines.forEach((l, idx) => {
    if (
      (l.includes('c.first_name') || l.includes('client.first_name') || l.includes('client_first_name') || l.includes('json_build_object')) &&
      !l.includes('middle_name')
    ) {
      hits.push(`  [L${idx + 1}] ${l.trim()}`);
    }
  });
  if (hits.length > 0) {
    console.log(`\n=== server/${f} (${hits.length}) ===`);
    hits.forEach(h => console.log(h));
  }
});
