import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Scanning ${folders.length} conversation folders...`);
    
    for (const folder of folders) {
        const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;
        
        const content = fs.readFileSync(transcriptPath, 'utf8');
        if (content.includes('SorenessHeatmap.tsx')) {
            console.log(`Folder ${folder} contains SorenessHeatmap.tsx reference.`);
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                try {
                    const obj = JSON.parse(line);
                    if (obj.tool_calls) {
                        for (const tc of obj.tool_calls) {
                            if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                                console.log(`  [Line ${i}] write_to_file length: ${tc.args.CodeContent.length}`);
                                if (tc.args.CodeContent.length > 5000) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\found_${folder}_line_${i}.tsx`, tc.args.CodeContent);
                                    console.log(`  -> Wrote to found_${folder}_line_${i}.tsx`);
                                }
                            } else if (tc.name === 'replace_file_content' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                                console.log(`  [Line ${i}] replace_file_content replacement length: ${tc.args.ReplacementContent.length}`);
                                if (tc.args.ReplacementContent.length > 5000) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\found_${folder}_replace_${i}.tsx`, tc.args.ReplacementContent);
                                    console.log(`  -> Wrote to found_${folder}_replace_${i}.tsx`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // skip
                }
            }
        }
    }
    console.log("Scan completed.");
} catch (e) {
    console.log("Error running scan:", e.message);
}
