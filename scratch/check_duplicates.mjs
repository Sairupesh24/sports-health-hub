import fs from 'fs';
import path from 'path';

const sqlPath = path.resolve(process.cwd(), 'supabase', 'seed_global_injuries.sql');
const content = fs.readFileSync(sqlPath, 'utf8');

const lines = content.split('\n');
const entries = new Set();
const duplicates = [];

lines.forEach((line, i) => {
    const match = line.match(/\(NULL, '(.*)', '(.*)', '(.*)'\)/);
    if (match) {
        const key = `${match[1]}|${match[2]}|${match[3]}`;
        if (entries.has(key)) {
            duplicates.push({ line: i + 1, text: line.trim() });
        } else {
            entries.add(key);
        }
    }
});

if (duplicates.length > 0) {
    console.log('Found duplicates in SQL file:');
    duplicates.forEach(d => console.log(`Line ${d.line}: ${d.text}`));
} else {
    console.log('No duplicates found in SQL file regex match.');
}
