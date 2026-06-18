import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Scanning raw content of ${folders.length} conversation folders for neck coordinate...`);
    
    for (const folder of folders) {
        const folderPath = path.join(brainDir, folder);
        const transcriptPath = path.join(folderPath, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;
        
        const content = fs.readFileSync(transcriptPath, 'utf8');
        if (content.includes('M235,160') || content.includes('shoulder_l_ant')) {
            console.log(`Folder ${folder} contains neck coordinate or shoulder_l_ant!`);
            const folderFiles = fs.readdirSync(folderPath);
            console.log(`  Files in folder:`, folderFiles);
            
            // Let's print line details
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('M235,160')) {
                    console.log(`    Line ${i} matches M235,160 (length ${line.length})`);
                }
            }
        }
    }
    console.log("Search completed.");
} catch (e) {
    console.log("Error:", e.message);
}
