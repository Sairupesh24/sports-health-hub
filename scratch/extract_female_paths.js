const fs = require('fs');
const path = require('path');

const filePath = 'd:/Sports_Physio_Software/sports-health-hub-main/react-native-body-highlighter-main/components/SvgFemaleWrapper.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Find all d="..." attributes
const matches = [];
const regex = /d="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  matches.push(match[1]);
}

console.log('Found ' + matches.length + ' paths.');
matches.forEach((val, idx) => {
  console.log(`--- PATH ${idx} (Length: ${val.length}) ---`);
  console.log('Start:', val.substring(0, 200));
  console.log('End:', val.substring(val.length - 200));
  
  // Write to a temporary file so we can view it fully
  fs.writeFileSync(`d:/Sports_Physio_Software/sports-health-hub-main/scratch/path_${idx}.txt`, val);
});
