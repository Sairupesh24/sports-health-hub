import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl";

try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Searching ${lines.length} lines for posterior muscle IDs...`);
    
    let index = 0;
    for (const line of lines) {
        if (!line.trim()) continue;
        if (line.includes('glute_l') || line.includes('hamstring_l') || line.includes('calf_l')) {
            console.log(`[Line ${index}] length: ${line.length}`);
            try {
                const obj = JSON.parse(line);
                let text = "";
                if (obj.content) text += obj.content;
                if (obj.tool_calls) {
                    obj.tool_calls.forEach(tc => {
                        if (tc.args && tc.args.CodeContent) text += tc.args.CodeContent;
                        if (tc.args && tc.args.ReplacementContent) text += tc.args.ReplacementContent;
                    });
                }
                const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\back_extracted_${index}.txt`;
                fs.writeFileSync(outPath, text);
                console.log(`  -> Wrote extracted back content to ${outPath}`);
            } catch (e) {
                console.log(`  -> Error:`, e.message);
            }
        }
        index++;
    }
} catch (e) {
    console.log("Error:", e.message);
}
