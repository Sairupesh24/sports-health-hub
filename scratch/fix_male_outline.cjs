const fs = require('fs');
const path = require('path');

const bodySvgPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'BodySvg.tsx');
let content = fs.readFileSync(bodySvgPath, 'utf8');

// Target the specific typo in the male back outline
const target = 'A 1.10 1.08 44.4 0 0 1 1084.32 752.00';
const replacement = 'A 1.10 1.08 44.4 0 0 1084.32 752.00';

if (!content.includes(target)) {
  console.error('Target string not found in BodySvg.tsx');
  process.exit(1);
}

content = content.replace(target, replacement);
fs.writeFileSync(bodySvgPath, content, 'utf8');

console.log('Successfully corrected male outline path in BodySvg.tsx!');
