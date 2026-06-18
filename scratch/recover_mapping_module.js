import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\.system_generated\\logs\\transcript.jsonl";

try {
    if (fs.existsSync(transcriptPath)) {
        const content = fs.readFileSync(transcriptPath, 'utf8');
        const lines = content.split('\n');
        console.log(`Scanning ${lines.length} lines for SorenessMappingModule.tsx...`);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('SorenessMappingModule.tsx')) {
                console.log(`[Line ${i}] length: ${line.length}`);
                try {
                    const obj = JSON.parse(line);
                    console.log(`  Source: ${obj.source}, Type: ${obj.type}`);
                    if (obj.tool_calls) {
                        obj.tool_calls.forEach((tc, tcIdx) => {
                            console.log(`    Tool: ${tc.name}`);
                            if (tc.args && tc.args.TargetFile) {
                                console.log(`      TargetFile: ${tc.args.TargetFile}`);
                            }
                            if (tc.args && tc.args.CodeContent) {
                                const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\mapping_write_${i}_tc_${tcIdx}.tsx`;
                                fs.writeFileSync(outPath, tc.args.CodeContent);
                                console.log(`      Wrote CodeContent length ${tc.args.CodeContent.length} to ${outPath}`);
                            }
                            if (tc.args && tc.args.ReplacementContent) {
                                const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\mapping_repl_${i}_tc_${tcIdx}.tsx`;
                                fs.writeFileSync(outPath, tc.args.ReplacementContent);
                                console.log(`      Wrote ReplacementContent length ${tc.args.ReplacementContent.length} to ${outPath}`);
                            }
                        });
                    }
                } catch (e) {
                    console.log(`  Error parsing:`, e.message);
                }
            }
        }
    } else {
        console.log("Transcript not found.");
    }
} catch (e) {
    console.log("Error:", e.message);
}
