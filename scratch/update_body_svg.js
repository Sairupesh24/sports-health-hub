const fs = require('fs');
const path = require('path');

const bodySvgPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'BodySvg.tsx');
const path1Path = path.join(__dirname, 'path_1.txt');

// Read both files
let bodySvgContent = fs.readFileSync(bodySvgPath, 'utf8');
const path1Content = fs.readFileSync(path1Path, 'utf8').trim();

// Locate the female back outline line: back: "m 1194.44,206.54..."
// We find where female: { is, then look for back: "..."
const femaleStartIndex = bodySvgContent.indexOf('female: {');
if (femaleStartIndex === -1) {
  console.error('Could not find female outline block start');
  process.exit(1);
}

const backSearchStr = 'back: "';
const backIndex = bodySvgContent.indexOf(backSearchStr, femaleStartIndex);
if (backIndex === -1) {
  console.error('Could not find back: " in female block');
  process.exit(1);
}

const startIndex = backIndex + backSearchStr.length;
const endIndex = bodySvgContent.indexOf('",', startIndex);
if (endIndex === -1) {
  console.error('Could not find ending of back path string');
  process.exit(1);
}

const oldPath = bodySvgContent.slice(startIndex, endIndex);
console.log('Old path starts with:', oldPath.slice(0, 50));
console.log('New path starts with:', path1Content.slice(0, 50));
console.log('Old path length:', oldPath.length);
console.log('New path length:', path1Content.length);

// Replace the path
const newContent = bodySvgContent.slice(0, startIndex) + path1Content + bodySvgContent.slice(endIndex);

fs.writeFileSync(bodySvgPath, newContent, 'utf8');
console.log('Successfully updated BodySvg.tsx with corrected back outline path!');
