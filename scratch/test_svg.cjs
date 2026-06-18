const fs = require('fs');

function parsePathsFromTsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /"([mMcClLhHvVqQsStTaAzZ0-9.,\s-]+)"/g;
  const paths = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const d = match[1];
    if (d.trim().match(/^[mM]/)) {
      paths.push(d);
    }
  }
  return paths;
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

let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 2000 1800" width="2000" height="1800" style="background:#fff;">`;

// Draw Front Outline
svgContent += `<!-- Front Outline -->`;
svgContent += `<path d="${wrapperFrontOutline}" fill="none" stroke="blue" stroke-width="3" />`;

// Draw Front Paths
const frontPaths = parsePathsFromTsFile('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleFront.ts');
frontPaths.forEach(d => {
  svgContent += `<path d="${d}" fill="rgba(255,0,0,0.2)" stroke="red" stroke-width="1" />`;
});

// Draw Back Outline
svgContent += `<!-- Back Outline -->`;
svgContent += `<path d="${wrapperBackOutline}" fill="none" stroke="green" stroke-width="3" />`;

// Draw Back Paths
const backPaths = parsePathsFromTsFile('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleBack.ts');
backPaths.forEach(d => {
  svgContent += `<path d="${d}" fill="rgba(0,255,0,0.2)" stroke="darkgreen" stroke-width="1" />`;
});

svgContent += `</svg>`;

fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/scratch/female_test.svg', svgContent);
console.log('Saved SVG to scratch/female_test.svg');
