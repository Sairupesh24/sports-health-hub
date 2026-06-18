import fs from 'fs';
import path from 'path';

const files = [
    'back_extracted_196.txt',
    'back_extracted_200.txt',
    'back_extracted_216.txt',
    'back_extracted_218.txt',
    'back_extracted_517.txt',
    'back_extracted_541.txt',
    'back_extracted_620.txt',
    'back_extracted_648.txt',
    'back_extracted_676.txt'
];

for (const file of files) {
    const filePath = path.join('d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch', file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`=== ${file} (length ${content.length}) ===`);
        console.log(content.substring(0, 500));
        console.log("==============================\n");
    }
}
