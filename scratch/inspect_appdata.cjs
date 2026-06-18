const fs = require('fs');
const path = require('path');

const appDataDir = 'C:/Users/kavut/.gemini/antigravity/brain/5c50d2a2-55c6-41a7-8cc5-e07e65517710';

function searchImages(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            searchImages(filePath);
        } else {
            if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
                console.log(`Found image: ${filePath} - ${stat.size} bytes`);
            }
        }
    }
}

console.log("Searching AppData conversation folder for images...");
searchImages(appDataDir);
// Let's also search parent folder C:/Users/kavut/.gemini/antigravity/brain/
searchImages('C:/Users/kavut/.gemini/antigravity/brain');
