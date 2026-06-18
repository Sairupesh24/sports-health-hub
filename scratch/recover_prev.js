import fs from 'fs';
const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\.system_generated\\logs\\transcript.jsonl";

try {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Found ${lines.length} lines in previous transcript.`);
    
    let index = 0;
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            if (obj.tool_calls) {
                for (const tc of obj.tool_calls) {
                    if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                        console.log(`[Line ${index}] Found write_to_file, content length:`, tc.args.CodeContent.length);
                        fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\prev_write_${index}.tsx`, tc.args.CodeContent);
                    } else if (tc.name === 'replace_file_content' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                        console.log(`[Line ${index}] Found replace_file_content, replacement length:`, tc.args.ReplacementContent.length);
                        fs.writeFileSync(`d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\prev_replace_${index}.tsx`, tc.args.ReplacementContent);
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        index++;
    }
} catch (e) {
    console.log("Error reading transcript:", e.message);
}
