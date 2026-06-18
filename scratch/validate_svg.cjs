const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/consultant/BodySvg.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Extract the male back outline path
const match = content.match(/back:\s*"([^"]+)"/);
if (!match) {
  console.error('Could not find male back outline in BodySvg.tsx');
  process.exit(1);
}

const pathStr = match[1];
console.log('Path length:', pathStr.length);

// Let's tokenise the path string to see what commands and parameters we find
// Space, comma, or newlines can separate coordinates
// Note: commands like 'L' can be attached to numbers, so we should be careful.
// But in our case they are mostly space separated. Let's use a regex to separate commands and numbers.
const tokens = pathStr.match(/[a-zA-Z]|[-+]?[0-9]*\.?[0-9]+/g);
console.log('Total tokens:', tokens.length);
console.log('First 20 tokens:', tokens.slice(0, 20));

// Basic SVG path parser to validate command structure
let idx = 0;

const expectedParams = {
  'M': 2, 'm': 2,
  'L': 2, 'l': 2,
  'H': 1, 'h': 1,
  'V': 1, 'v': 1,
  'C': 6, 'c': 6,
  'S': 4, 's': 4,
  'Q': 4, 'q': 4,
  'T': 2, 't': 2,
  'A': 7, 'a': 7,
  'Z': 0, 'z': 0
};

let currentCmd = '';
let paramsNeeded = 0;
let actualParams = [];

while (idx < tokens.length) {
  let token = tokens[idx];
  let isCommand = expectedParams.hasOwnProperty(token);
  
  if (isCommand) {
    // Before starting a new command, let's check if the previous one had enough params
    if (currentCmd && actualParams.length > 0 && actualParams.length < paramsNeeded) {
      console.error(`Error: Command ${currentCmd} ended prematurely. Expected ${paramsNeeded} params, got ${actualParams.length}:`, actualParams);
      console.error('Next token was command:', token);
      process.exit(1);
    }
    
    currentCmd = token;
    paramsNeeded = expectedParams[token];
    actualParams = [];
    idx++;
  } else {
    // If it's a number
    if (!currentCmd) {
      console.error(`Error: Found coordinate ${token} before any command`);
      process.exit(1);
    }
    
    actualParams.push(token);
    idx++;
    
    // If we have collected enough parameters for the current command
    if (actualParams.length === paramsNeeded) {
      // In SVG paths, subsequent groups of parameters repeat the command implicitly.
      // So if we get more numbers, they will be treated as the same command.
      // We reset actualParams to accept the next group of parameters.
      actualParams = [];
    }
  }
}

if (currentCmd && actualParams.length > 0 && actualParams.length < paramsNeeded) {
  console.error(`Error: Path ended with incomplete command ${currentCmd}. Expected ${paramsNeeded} params, got ${actualParams.length}:`, actualParams);
  process.exit(1);
}

console.log('Path parsing complete without structural/parameter count mismatch errors.');
