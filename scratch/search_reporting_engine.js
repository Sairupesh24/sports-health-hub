import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Scanning raw content of ${folders.length} conversation folders for Clinical Reporting Engine...`);
    
    for (const folder of folders) {
        const folderPath = path.join(brainDir, folder);
        const transcriptPath = path.join(folderPath, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;
        
        const content = fs.readFileSync(transcriptPath, 'utf8');
        if (content.includes('ANATOMICAL REMARKS CHECKLIST') || content.includes('Clinical Reporting Engine')) {
            console.log(`Folder ${folder} matches!`);
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('ANATOMICAL REMARKS CHECKLIST') && line.length > 3000) {
                    console.log(`  [Line ${i}] length: ${line.length}`);
                    try {
                        const obj = JSON.parse(line);
                        console.log(`    Source: ${obj.source}, Type: ${obj.type}`);
                        if (obj.tool_calls) {
                            obj.tool_calls.forEach((tc, tcIdx) => {
                                if (tc.args && tc.args.CodeContent) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\rep_${folder}_tc_${tcIdx}.tsx`, tc.args.CodeContent);
                                    console.log(`    Wrote CodeContent to rep_${folder}_tc_${tcIdx}.tsx`);
                                }
                                if (tc.args && tc.args.ReplacementContent) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\rep_${folder}_tc_${tcIdx}_repl.tsx`, tc.args.ReplacementContent);
                                    console.log(`    Wrote ReplacementContent to rep_${folder}_tc_${tcIdx}_repl.tsx`);
                                }
                            });
                        }
                    } catch (e) {
                        console.log(`    Error parsing line JSON:`, e.message);
                    }
                }
            }
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
