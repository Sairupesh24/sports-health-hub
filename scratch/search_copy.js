import fs from 'fs';
const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl";
const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('anatomy_heatmap_bg.png') && (line.includes('Copy-Item') || line.includes('copy') || line.includes('cp'))) {
        console.log(`Line ${i}: length ${line.length}`);
        console.log(line.substring(0, Math.min(line.length, 1000)));
    }
}
