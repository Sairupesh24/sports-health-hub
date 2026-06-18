import fs from 'fs';
import path from 'path';

const lostDir = 'd:\\Sports_Physio_Software\\sports-health-hub-main\\.git\\lost-found\\other';

try {
    if (fs.existsSync(lostDir)) {
        const files = fs.readdirSync(lostDir);
        console.log(`Found ${files.length} files in lost-found/other.`);
        
        for (const file of files) {
            const filePath = path.join(lostDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('M235,160') || content.includes('shoulder_l_ant') || content.includes('SorenessHeatmap')) {
                console.log(`File ${file} matches! Length: ${content.length}`);
                fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\git_recovered_${file}.tsx`, content);
                console.log(`  -> Recovered to git_recovered_${file}.tsx`);
            }
        }
    } else {
        console.log("lost-found/other directory does not exist.");
    }
} catch (e) {
    console.log("Error:", e.message);
}
