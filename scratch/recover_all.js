import fs from 'fs';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl";

const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('SorenessHeatmap.tsx')) {
        console.log(`Line ${i}: length ${line.length}`);
        try {
            const obj = JSON.parse(line);
            console.log(`  Step Index: ${obj.step_index}`);
            console.log(`  Source: ${obj.source}`);
            console.log(`  Type: ${obj.type}`);
            if (obj.tool_calls) {
                obj.tool_calls.forEach(tc => {
                    console.log(`    Tool: ${tc.name}`);
                    if (tc.args && tc.args.TargetFile) {
                        console.log(`      TargetFile: ${tc.args.TargetFile}`);
                    }
                    if (tc.args && tc.args.CodeContent) {
                        console.log(`      CodeContent length: ${tc.args.CodeContent.length}`);
                        fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\code_step_${obj.step_index}.tsx`, tc.args.CodeContent);
                    }
                    if (tc.args && tc.args.ReplacementContent) {
                        console.log(`      ReplacementContent length: ${tc.args.ReplacementContent.length}`);
                    }
                });
            }
        } catch (e) {
            console.log(`  Malformed JSON: ${e.message}`);
        }
    }
}
