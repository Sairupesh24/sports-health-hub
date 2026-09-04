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
    } else if (/\.(tsx|ts|jsx|js|sql)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src').concat(walk('./server'));
const matches = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for patterns like `${...first_name...last_name}` or `first_name + " " + last_name` without middle_name
    if ((line.includes('first_name') || line.includes('firstName')) && 
        (line.includes('last_name') || line.includes('lastName')) && 
        !line.includes('middle_name') && !line.includes('middleName')) {
      matches.push({ file, lineNum: idx + 1, line: line.trim() });
    }
  });
}

console.log(`Found ${matches.length} candidate lines.`);
fs.writeFileSync('./scratch/matches.json', JSON.stringify(matches, null, 2));
