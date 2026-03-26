const fs = require('fs');
const lines = fs.readFileSync('d:\\Sports_Physio_Software\\sports-health-hub-main\\src\\pages\\admin\\ClientProfile.tsx', 'utf8').split('\n');

let balance = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    balance += (opens - closes);
    if (balance !== 0) {
        console.log(`Line ${i + 1} [bal=${balance}]: ${line.trim().substring(0, 80)}`);
    }
});
console.log(`Final paren balance: ${balance}`);
