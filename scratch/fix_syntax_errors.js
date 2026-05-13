import fs from 'fs';
import path from 'path';

const srcDir = 'd:/Sports_Physio_Software/sports-health-hub-main/src';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('\\"')) {
                const fixed = content.replace(/\\"/g, '"');
                fs.writeFileSync(fullPath, fixed);
                console.log(`Fixed: ${fullPath}`);
            }
        }
    }
}

walk(srcDir);
