import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\.system_generated\\logs\\transcript.jsonl";

if (fs.existsSync(transcriptPath)) {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    console.log(`Scanning e2f1f80a transcript... Total lines: ${lines.length}`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('SorenessMappingModule.tsx')) {
            try {
                const obj = JSON.parse(line);
                let toolInfo = '';
                if (obj.tool_calls) {
                    toolInfo = obj.tool_calls.map(tc => `${tc.name} (${tc.args ? Object.keys(tc.args).join(',') : 'no args'})`).join(', ');
                }
                console.log(`Line ${i}: Length ${line.length} | Source: ${obj.source} | Type: ${obj.type} | Tools: ${toolInfo}`);
            } catch (e) {
                console.log(`Line ${i}: Length ${line.length} | JSON Error: ${e.message}`);
            }
        }
    }
} else {
    console.log("Not found.");
}
