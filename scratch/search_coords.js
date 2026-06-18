import fs from 'fs';
const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl";
const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('calf_l') || line.includes('glute_l')) {
        console.log(`Line ${i} contains calf_l/glute_l: length ${line.length}`);
        const idx = line.indexOf('calf_l');
        if (idx !== -1) {
            console.log("  calf_l surrounding:", line.substring(Math.max(0, idx - 150), Math.min(line.length, idx + 400)));
        }
        const idx2 = line.indexOf('glute_l');
        if (idx2 !== -1) {
            console.log("  glute_l surrounding:", line.substring(Math.max(0, idx2 - 150), Math.min(line.length, idx2 + 400)));
        }
    }
}
