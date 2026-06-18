const fs = require('fs');

function parsePathToPoints(d) {
  const points = [];
  const commands = d.match(/([a-df-zADF-Z])|([-+]?[0-9]*\.?[0-9]+)/g) || [];
  
  let x = 0, y = 0;
  let i = 0;
  
  while (i < commands.length) {
    let cmd = commands[i];
    if (cmd.match(/[a-df-zADF-Z]/)) {
      i++;
      if (cmd === 'm' || cmd === 'M') {
        const px = parseFloat(commands[i++]);
        const py = parseFloat(commands[i++]);
        if (cmd === 'm') {
          x += px;
          y += py;
        } else {
          x = px;
          y = py;
        }
        points.push({ x, y });
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const lx = parseFloat(commands[i++]);
          const ly = parseFloat(commands[i++]);
          if (cmd === 'm') {
            x += lx;
            y += ly;
          } else {
            x = lx;
            y = ly;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'c' || cmd === 'C') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const x1 = parseFloat(commands[i++]);
          const y1 = parseFloat(commands[i++]);
          const x2 = parseFloat(commands[i++]);
          const y2 = parseFloat(commands[i++]);
          const x3 = parseFloat(commands[i++]);
          const y3 = parseFloat(commands[i++]);
          if (cmd === 'c') {
            x += x3;
            y += y3;
          } else {
            x = x3;
            y = y3;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'q' || cmd === 'Q') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const x1 = parseFloat(commands[i++]);
          const y1 = parseFloat(commands[i++]);
          const x2 = parseFloat(commands[i++]);
          const y2 = parseFloat(commands[i++]);
          if (cmd === 'q') {
            x += x2;
            y += y2;
          } else {
            x = x2;
            y = y2;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'l' || cmd === 'L') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const lx = parseFloat(commands[i++]);
          const ly = parseFloat(commands[i++]);
          if (cmd === 'l') {
            x += lx;
            y += ly;
          } else {
            x = lx;
            y = ly;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'h' || cmd === 'H') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const lx = parseFloat(commands[i++]);
          if (cmd === 'h') {
            x += lx;
          } else {
            x = lx;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'v' || cmd === 'V') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const ly = parseFloat(commands[i++]);
          if (cmd === 'v') {
            y += ly;
          } else {
            y = ly;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'a' || cmd === 'A') {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          const rx = parseFloat(commands[i++]);
          const ry = parseFloat(commands[i++]);
          const rot = parseFloat(commands[i++]);
          const large = parseFloat(commands[i++]);
          const sweep = parseFloat(commands[i++]);
          const ax = parseFloat(commands[i++]);
          const ay = parseFloat(commands[i++]);
          if (cmd === 'a') {
            x += ax;
            y += ay;
          } else {
            x = ax;
            y = ay;
          }
          points.push({ x, y });
        }
      } else if (cmd === 'z' || cmd === 'Z') {
      } else {
        while (i < commands.length && !commands[i].match(/[a-df-zADF-Z]/)) {
          i++;
        }
      }
    } else {
      i++;
    }
  }
  return points;
}

function getTrueBounds(points) {
  if (points.length === 0) return null;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX)/2, centerY: (minY + maxY)/2 };
}

function printSlugsBounds(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let cleaned = content.replace(/import {[^}]+} from [^;]+;/, "")
                       .replace(/: BodyPart\[\]/g, "")
                       .replace("export const ", "global.");
  eval(cleaned);
  const data = filePath.includes('FemaleFront') ? global.bodyFemaleFront : global.bodyFemaleBack;
  
  data.forEach(item => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let hasPaths = false;
    ['common', 'left', 'right'].forEach(side => {
      const paths = item.path?.[side] || [];
      paths.forEach(d => {
        hasPaths = true;
        const box = getTrueBounds(parsePathToPoints(d));
        if (box) {
          minX = Math.min(minX, box.minX);
          maxX = Math.max(maxX, box.maxX);
          minY = Math.min(minY, box.minY);
          maxY = Math.max(maxY, box.maxY);
        }
      });
    });
    if (hasPaths) {
      console.log(`Slug: ${item.slug.padEnd(15)} | X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} | Y: ${minY.toFixed(2)} to ${maxY.toFixed(2)}`);
    }
  });
}

console.log('--- FEMALE FRONT SLUGS BOUNDS ---');
printSlugsBounds('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleFront.ts');

console.log('\n--- FEMALE BACK SLUGS BOUNDS ---');
printSlugsBounds('d:/Sports_Physio_Software/sports-health-hub-main/src/components/consultant/bodyFemaleBack.ts');
