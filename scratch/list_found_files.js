import fs from 'fs';
import path from 'path';

const scratchDir = "d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch";
const files = fs.readdirSync(scratchDir);

const foundFiles = files
    .filter(f => f.startsWith('found_e2f1f80a-03a6-4079-a77d-175f54b036f6_'))
    .map(f => {
        const stats = fs.statSync(path.join(scratchDir, f));
        return { name: f, size: stats.size };
    });

console.log(`Found ${foundFiles.length} files:`);
foundFiles.forEach(f => console.log(`  - ${f.name} (${f.size} bytes)`));
