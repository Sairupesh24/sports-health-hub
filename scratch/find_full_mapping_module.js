import fs from 'fs';
import path from 'path';

const brainDir = 'C:\\Users\\kavut\\.gemini\\antigravity\\brain';

try {
    const folders = fs.readdirSync(brainDir);
    console.log(`Found brain folders: ${folders.join(', ')}`);
    
    for (const folder of folders) {
        const transcriptPath = path.join(brainDir, folder, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;
        
        console.log(`Scanning ${transcriptPath}...`);
        const content = fs.readFileSync(transcriptPath, 'utf8');
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('SorenessMappingModule.tsx')) {
                console.log(`  Folder: ${folder}, Line ${i}: Length = ${line.length}`);
                try {
                    const obj = JSON.parse(line);
                    console.log(`    source: ${obj.source}, type: ${obj.type}`);
                    if (obj.tool_calls) {
                        obj.tool_calls.forEach((tc, idx) => {
                            console.log(`      tool: ${tc.name}`);
                            if (tc.args) {
                                console.log(`        keys: ${Object.keys(tc.args).join(', ')}`);
                                if (tc.args.TargetFile) {
                                    console.log(`        TargetFile: ${tc.args.TargetFile}`);
                                }
                                if (tc.args.CodeContent) {
                                    const len = tc.args.CodeContent.length;
                                    console.log(`        CodeContent length: ${len}`);
                                    const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\found_${folder}_line_${i}_tc_${idx}_code.tsx`;
                                    fs.writeFileSync(outPath, tc.args.CodeContent);
                                    console.log(`        Wrote CodeContent to ${outPath}`);
                                }
                                if (tc.args.ReplacementContent) {
                                    const len = tc.args.ReplacementContent.length;
                                    console.log(`        ReplacementContent length: ${len}`);
                                    const outPath = `d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\found_${folder}_line_${i}_tc_${idx}_repl.tsx`;
                                    fs.writeFileSync(outPath, tc.args.ReplacementContent);
                                    console.log(`        Wrote ReplacementContent to ${outPath}`);
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.log(`    JSON parse error on line ${i}: ${e.message}`);
                }
            }
        }
    }
} catch (e) {
    console.log("Error:", e.message);
}
