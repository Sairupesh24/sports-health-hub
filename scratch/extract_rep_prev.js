import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\.system_generated\\logs\\transcript.jsonl";

try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Found ${lines.length} lines in previous transcript.`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('ANATOMICAL REMARKS CHECKLIST') || line.includes('AssessmentReport.tsx') || line.includes('ReportsPage.tsx')) {
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
                            fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\prev_rep_write_${i}_tc_${tcIdx}.tsx`, tc.args.CodeContent);
                            console.log(`      Wrote CodeContent length ${tc.args.CodeContent.length}`);
                        }
                        if (tc.args && tc.args.ReplacementContent) {
                            fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\prev_rep_repl_${i}_tc_${tcIdx}.tsx`, tc.args.ReplacementContent);
                            console.log(`      Wrote ReplacementContent length ${tc.args.ReplacementContent.length}`);
                        }
                    });
                }
            } catch (e) {
                // ignore
            }
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
