const fs = require('fs');

function getBoundingBox(d) {
  const matches = d.match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (!matches) return null;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < matches.length - 1; i += 2) {
    const x = parseFloat(matches[i]);
    const y = parseFloat(matches[i+1]);
    if (!isNaN(x) && !isNaN(y)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, maxX, minY, maxY };
}

function parsePathsFromTsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /"([mMcClLhHvVqQsStTaAzZ0-9.,\s-]+)"/g;
  let match;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  while ((match = regex.exec(content)) !== null) {
    const d = match[1];
    // Simple check: SVG path usually starts with m or M or has some letters
    if (d.trim().match(/^[mM]/)) {
      const box = getBoundingBox(d);
      if (box) {
        minX = Math.min(minX, box.minX);
        maxX = Math.max(maxX, box.maxX);
        minY = Math.min(minY, box.minY);
        maxY = Math.max(maxY, box.maxY);
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

const wrapperContent = fs.readFileSync('d:/Sports_Physio_Software/sports-health-hub-main/react-native-body-highlighter-main/components/SvgFemaleWrapper.tsx', 'utf8');
const wrapperPaths = [];
const regex = /d="([^"]+)"/g;
let match;
while ((match = regex.exec(wrapperContent)) !== null) {
  wrapperPaths.push(match[1]);
}

const wrapperFrontOutline = wrapperPaths[0];
const wrapperBackOutline = wrapperPaths[1];

console.log('Wrapper Front Outline Bounds:', getBoundingBox(wrapperFrontOutline));
console.log('Paths Female Front Bounds:', parsePathsFromTsFile('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleFront.ts'));

console.log('Wrapper Back Outline Bounds:', getBoundingBox(wrapperBackOutline));
console.log('Paths Female Back Bounds:', parsePathsFromTsFile('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleBack.ts'));
