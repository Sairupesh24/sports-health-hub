import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Scanning ${folders.length} folders for plans/walkthroughs...`);
    
    for (const folder of folders) {
        const folderPath = path.join(brainDir, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        const files = ['implementation_plan.md', 'walkthrough.md', 'task.md'];
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const titleLine = content.split('\n')[0] || '';
                console.log(`[${folder}] ${file}: ${titleLine.trim()}`);
                if (titleLine.toLowerCase().includes('heatmap') || content.toLowerCase().includes('heatmap')) {
                    console.log(`  -> Matches heatmap! Length: ${content.length}`);
                }
            }
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
