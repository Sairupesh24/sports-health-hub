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
const tokens = pathStr.split(/[\s,]+/);
console.log('Total tokens:', tokens.length);

// Basic SVG path parser to validate command structure
let idx = 0;
let cmdCount = 0;

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

while (idx < tokens.length) {
  let token = tokens[idx];
  if (!token) {
    idx++;
    continue;
  }
  
  let cmd = token[0];
  let isCommand = expectedParams.hasOwnProperty(cmd);
  
  if (isCommand) {
    let paramsNeeded = expectedParams[cmd];
    let actualParams = [];
    
    // In some cases the command letter is prefixed to the first number without space, e.g. "M100"
    let numberPart = token.slice(1);
    idx++;
    
    if (numberPart) {
      actualParams.push(numberPart);
    }
    
    while (actualParams.length < paramsNeeded && idx < tokens.length) {
      let nextToken = tokens[idx];
      if (expectedParams.hasOwnProperty(nextToken[0])) {
        // We hit the next command before getting all parameters!
        console.error(`Error: Command ${cmd} at token index ${idx} expected ${paramsNeeded} parameters but only got ${actualParams.length}:`, actualParams);
        console.error('Next token was:', nextToken);
        process.exit(1);
      }
      actualParams.push(nextToken);
      idx++;
    }
    
    console.log(`Parsed command ${cmd} with parameters:`, actualParams.join(' '));
  } else {
    // If not a command, it is an implicit repeat of the previous command
    console.log(`Implicit repeat or unexpected token: ${token}`);
    idx++;
  }
}

console.log('Path parsing complete without structure mismatch errors.');
