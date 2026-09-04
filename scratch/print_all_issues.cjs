const fs = require('fs');

const issues = JSON.parse(fs.readFileSync('./scratch/client_name_issues.json', 'utf8'));

const filesMap = {};
issues.forEach(item => {
  if (!filesMap[item.file]) filesMap[item.file] = [];
  filesMap[item.file].push(item);
});

console.log(`Files count: ${Object.keys(filesMap).length}`);

for (const [f, list] of Object.entries(filesMap)) {
  console.log(`\n=============================`);
  console.log(`FILE: ${f} (${list.length})`);
  console.log(`=============================`);
  list.forEach(item => {
    console.log(`[L${item.lineNum}] ${item.line}`);
  });
}
