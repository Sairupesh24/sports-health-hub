const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', '.git', 'dist', 'generated', 'scratch'].includes(file)) continue;
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

const allFiles = walk('./src').concat(walk('./server'));

const findings = [];

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    // Look for any string template or string concat involving first_name and last_name (or firstName and lastName) where middle name is omitted
    const match1 = line.match(/([a-zA-Z0-9_?.()]+(?:\.|\?\.)(?:first_name|firstName))\s*(?:[+,]|\s*\}\s*|\s*\|\|\s*')\s*([a-zA-Z0-9_?.()]+(?:\.|\?\.)(?:last_name|lastName))/);
    const match2 = line.match(/\b(first_name|firstName)\b.*?\b(last_name|lastName)\b/);
    if ((match1 || match2) && !line.includes('middle_name') && !line.includes('middleName')) {
      findings.push({
        file: file.replace(/\\/g, '/'),
        lineNum: index + 1,
        line: line.trim()
      });
    }
  });
});

fs.writeFileSync('./scratch/detailed_findings.json', JSON.stringify(findings, null, 2));
console.log(`Total findings: ${findings.length}`);
