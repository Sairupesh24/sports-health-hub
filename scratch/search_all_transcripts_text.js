import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Scanning raw content of ${folders.length} conversation folders...`);
    
    for (const folder of folders) {
        const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;
        
        const content = fs.readFileSync(transcriptPath, 'utf8');
        if (content.includes('forearm_r_ant') && content.includes('quad_l') && content.includes('view: "front"')) {
            console.log(`Folder ${folder} contains forearm_r_ant and quad_l!`);
            // Let's find where this happens. We will split by lines and look for large segments.
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('forearm_r_ant') && line.length > 5000) {
                    console.log(`  [Line ${i}] Line length: ${line.length}`);
                    try {
                        const obj = JSON.parse(line);
                        // Let's print properties of obj to see what it is
                        console.log(`    Source: ${obj.source}, Type: ${obj.type}`);
                        // Let's write the content or tool call arguments
                        if (obj.content) {
                            fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\msg_${folder}_line_${i}.txt`, obj.content);
                            console.log(`    Wrote content to msg_${folder}_line_${i}.txt`);
                        }
                        if (obj.tool_calls) {
                            obj.tool_calls.forEach((tc, tcIdx) => {
                                if (tc.args && tc.args.CodeContent) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\tool_${folder}_line_${i}_tc_${tcIdx}.tsx`, tc.args.CodeContent);
                                    console.log(`    Wrote CodeContent to tool_${folder}_line_${i}_tc_${tcIdx}.tsx`);
                                }
                                if (tc.args && tc.args.ReplacementContent) {
                                    fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\tool_${folder}_line_${i}_tc_${tcIdx}_repl.tsx`, tc.args.ReplacementContent);
                                    console.log(`    Wrote ReplacementContent to tool_${folder}_line_${i}_tc_${tcIdx}_repl.tsx`);
                                }
                            });
                        }
                    } catch (e) {
                        // If not valid JSON, write the raw line segment
                        console.log(`    Could not parse JSON: ${e.message}`);
                    }
                }
            }
        }
    }
    console.log("Global text search completed.");
} catch (e) {
    console.log("Error in search:", e.message);
}
