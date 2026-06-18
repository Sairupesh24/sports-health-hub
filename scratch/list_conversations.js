import fs from 'fs';
const dir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';
try {
    const files = fs.readdirSync(dir);
    console.log("Found folders in brain:", files);
} catch (e) {
    console.log("Error reading brain dir:", e.message);
}
