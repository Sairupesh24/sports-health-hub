import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.system_generated\\logs\\transcript.jsonl";
const outputPath = "d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\SorenessHeatmap_full.tsx";

const content = fs.readFileSync(transcriptPath, 'utf8');
const lines = content.split('\n');

let latestCode = null;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
            for (const tc of obj.tool_calls) {
                if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                    latestCode = tc.args.CodeContent;
                    console.log("Found write_to_file call, length:", latestCode.length);
                } else if (tc.name === 'replace_file_content' && tc.args.TargetFile && tc.args.TargetFile.includes('SorenessHeatmap.tsx')) {
                    console.log("Found replace_file_content call, startLine:", tc.args.StartLine, "endLine:", tc.args.EndLine);
                }
            }
        }
    } catch (e) {
        // Skip malformed JSON
    }
}

if (latestCode) {
    fs.writeFileSync(outputPath, latestCode, 'utf8');
    console.log("Successfully wrote full recovered code to:", outputPath);
} else {
    console.log("No code found.");
}
