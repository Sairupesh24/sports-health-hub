import fs from 'fs';
const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\c847b602-6182-4537-9307-8c1660fdb4e0\\.system_generated\\logs\\transcript.jsonl";

try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Found ${lines.length} lines in c847b602...`);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('SorenessHeatmap.tsx')) {
            console.log(`Line ${i}:`, line.substring(0, 500));
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
