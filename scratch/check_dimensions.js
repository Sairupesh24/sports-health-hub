import fs from 'fs';
import path from 'path';

// Let's run a quick check using basic file inspections
console.log("Checking image files...");
const publicDir = "public";
const files = ["anatomy_heatmap_bg.png", "anatomy_heatmap_bg_grayscale.png", "anatomy_heatmap_front.png", "anatomy_heatmap_back.png"];

files.forEach(f => {
    const p = path.join(publicDir, f);
    if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        console.log(`File: ${f} | Size: ${stats.size} bytes`);
    } else {
        console.log(`File: ${f} | NOT FOUND`);
    }
});
