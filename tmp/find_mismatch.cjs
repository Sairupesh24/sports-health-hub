const fs = require('fs');
const lines = fs.readFileSync('d:\\Sports_Physio_Software\\sports-health-hub-main\\src\\pages\\admin\\ClientProfile.tsx', 'utf8').split('\n');

let balance = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/\(/g) || []).length;
    const closes = (line.match(/\)/g) || []).length;
    balance += (opens - closes);
    if (balance < 0) {
        console.log(`Paren imbalance at line ${i + 1}: ${balance}`);
        balance = 0; // Reset to find more
    }
});

let braceBalance = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceBalance += (opens - closes);
    if (braceBalance < 0) {
        console.log(`Brace imbalance at line ${i + 1}: ${braceBalance}`);
        braceBalance = 0;
    }
});
