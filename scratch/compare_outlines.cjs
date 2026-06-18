const fs = require('fs');

const bodySvgContent = fs.readFileSync('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/BodySvg.tsx', 'utf8');

const femaleSection = bodySvgContent.match(/female:\s*\{([^}]+)\}/);
if (!femaleSection) {
  console.log('Could not find female section in BodySvg.tsx');
  process.exit(1);
}

const frontMatch = femaleSection[1].match(/front:\s*"([^"]+)"/);
if (!frontMatch) {
  console.log('Could not find front outline in female section');
  process.exit(1);
}

const fileFrontOutline = frontMatch[1];

// Load from SvgFemaleWrapper.tsx
const wrapperContent = fs.readFileSync('d:/Sports_Physio_Software/sports-health-hub-main/react-native-body-highlighter-main/components/SvgFemaleWrapper.tsx', 'utf8');
const wrapperPaths = [];
const regex = /d="([^"]+)"/g;
let match;
while ((match = regex.exec(wrapperContent)) !== null) {
  wrapperPaths.push(match[1]);
}
const wrapperFrontOutline = wrapperPaths[0];

console.log('File front outline length:', fileFrontOutline.length);
console.log('Wrapper front outline length:', wrapperFrontOutline.length);

if (fileFrontOutline === wrapperFrontOutline) {
  console.log('Front outlines are IDENTICAL!');
} else {
  console.log('Front outlines DIFFERENT!');
  console.log('File starts with:', fileFrontOutline.substring(0, 100));
  console.log('Wrapper starts with:', wrapperFrontOutline.substring(0, 100));
  
  // Find where they differ
  let diffIdx = -1;
  for (let i = 0; i < Math.min(fileFrontOutline.length, wrapperFrontOutline.length); i++) {
    if (fileFrontOutline[i] !== wrapperFrontOutline[i]) {
      diffIdx = i;
      break;
    }
  }
  if (diffIdx !== -1) {
    console.log('Differ at index:', diffIdx);
    console.log('File char:', fileFrontOutline.substring(diffIdx, diffIdx + 50));
    console.log('Wrapper char:', wrapperFrontOutline.substring(diffIdx, diffIdx + 50));
  }
}
