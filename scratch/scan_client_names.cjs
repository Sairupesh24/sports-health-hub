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

const files = walk('./src').concat(walk('./server'));
const clientNameIssues = [];

const clientKeywords = ['client', 'athlete', 'patient', 'user_id', 'c\\.', 'c\\?'];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line formats a name with first and last, but not middle
    const hasFirst = /first_name|firstName/i.test(line);
    const hasLast = /last_name|lastName/i.test(line);
    const hasMiddle = /middle_name|middleName/i.test(line);

    if (hasFirst && hasLast && !hasMiddle) {
      clientNameIssues.push({
        file: file.replace(/\\/g, '/'),
        lineNum: idx + 1,
        line: line.trim()
      });
    }
  });
}

console.log(`Found ${clientNameIssues.length} lines with first & last but no middle name.`);
fs.writeFileSync('./scratch/client_name_issues.json', JSON.stringify(clientNameIssues, null, 2));
