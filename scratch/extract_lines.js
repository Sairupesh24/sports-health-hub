import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

function scanFolder(folder) {
    const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(transcriptPath)) return;
    
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('M235,160')) {
            console.log(`[Folder ${folder} Line ${i}] length: ${line.length}`);
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
                const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\extracted_${folder}_${i}.txt`;
                fs.writeFileSync(outPath, text);
                console.log(`  -> Wrote extracted content to ${outPath}`);
            } catch (e) {
                console.log(`  -> Error parsing JSON:`, e.message);
            }
        }
    }
}

scanFolder('5c50d2a2-55c6-41a7-8cc5-e07e65517710');
scanFolder('e2f1f80a-03a6-4079-a77d-175f54b036f6');
