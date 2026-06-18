import fs from 'fs';
import path from 'path';

const transcriptPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\.system_generated\\logs\\transcript.jsonl";

if (fs.existsSync(transcriptPath)) {
    const content = fs.readFileSync(transcriptPath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('SorenessMappingModule.tsx')) {
            try {
                const obj = JSON.parse(line);
                if (obj.tool_calls) {
                    obj.tool_calls.forEach((tc, idx) => {
                        if (tc.name === 'write_to_file' && tc.args && tc.args.CodeContent) {
                            const size = tc.args.CodeContent.length;
                            const target = tc.args.TargetFile;
                            console.log(`Found write_to_file at line ${i}! Target: ${target}, size: ${size}`);
                            const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\SorenessMappingModule_base_${i}.tsx`;
                            fs.writeFileSync(outPath, tc.args.CodeContent);
                            console.log(`Wrote base code to ${outPath}`);
                        }
                    });
                }
            } catch (e) {
                // Ignore json parsing errors
            }
        }
    }
} else {
    console.log("Transcript not found.");
}
