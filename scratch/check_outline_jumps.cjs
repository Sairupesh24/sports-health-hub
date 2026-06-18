const fs = require('fs');
const path = require('path');

const bodySvgPath = path.join(__dirname, '..', 'src', 'components', 'consultant', 'BodySvg.tsx');
const content = fs.readFileSync(bodySvgPath, 'utf8');

// Extract OUTLINES.male.front and OUTLINES.male.back
const outlinesMatch = content.match(/male:\s*\{([\s\S]*?)\}/);
if (!outlinesMatch) {
  console.error('Could not find male outlines block');
  process.exit(1);
}

const maleBlock = outlinesMatch[1];
const frontMatch = maleBlock.match(/front:\s*"([^"]+)"/);
const backMatch = maleBlock.match(/back:\s*"([^"]+)"/);

if (!frontMatch || !backMatch) {
  console.error('Could not find front or back path strings');
  process.exit(1);
}

const frontPath = frontMatch[1];
const backPath = backMatch[1];

function parsePathCommands(pathStr, name) {
  console.log(`\nParsing commands for ${name}:`);
  const cmdRegex = /([a-zA-Z])([^a-zA-Z]*)/g;
  let match;
  let cmdCount = 0;
  
  while ((match = cmdRegex.exec(pathStr)) !== null) {
    cmdCount++;
    const command = match[1];
    const coordsStr = match[2].trim();
    if (!coordsStr) continue;
    
    // Split coords by spaces or commas, handle negatives
    const coords = coordsStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    
    // For these absolute commands, check if any coordinate value crosses the expected boundary:
    if (command === 'M' || command === 'L' || command === 'T' || command === 'C' || command === 'S' || command === 'Q' || command === 'T' || command === 'A') {
      let xCoords = [];
      if (command === 'M' || command === 'L' || command === 'T') {
        for (let i = 0; i < coords.length; i += 2) xCoords.push(coords[i]);
      } else if (command === 'Q') {
        for (let i = 0; i < coords.length; i += 4) {
          xCoords.push(coords[i]);
          xCoords.push(coords[i + 2]);
        }
      } else if (command === 'C') {
        for (let i = 0; i < coords.length; i += 6) {
          xCoords.push(coords[i]);
          xCoords.push(coords[i + 2]);
          xCoords.push(coords[i + 4]);
        }
      } else if (command === 'A') {
        for (let i = 0; i < coords.length; i += 7) {
          xCoords.push(coords[i + 5]);
        }
      }
      
      xCoords.forEach(x => {
        if (name === 'front' && (x < -10 || x > 750)) {
          console.log(`Command ${cmdCount}: ${command} has out of bounds X: ${x} (full args: ${coordsStr})`);
        }
        if (name === 'back' && (x < 700 || x > 1460)) {
          console.log(`Command ${cmdCount}: ${command} has out of bounds X: ${x} (full args: ${coordsStr})`);
        }
      });
    }
  }
  console.log(`Total commands parsed: ${cmdCount}`);
}

parsePathCommands(frontPath, 'front');
parsePathCommands(backPath, 'back');
