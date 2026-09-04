const fs = require('fs');

const lines = fs.readFileSync('./scratch/all_issues.txt', 'utf8').split('\n');

let currentFile = '';
const fileSummary = {};

lines.forEach(line => {
  if (line.startsWith('FILE: ')) {
    currentFile = line.replace('FILE: ', '').split(' (')[0];
    fileSummary[currentFile] = [];
  } else if (line.startsWith('[')) {
    if (currentFile) fileSummary[currentFile].push(line);
  }
});

for (const [file, items] of Object.entries(fileSummary)) {
  console.log(`${file}: ${items.length} occurrences`);
}
