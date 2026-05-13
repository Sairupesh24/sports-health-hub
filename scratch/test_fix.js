import fs from 'fs';
const content = fs.readFileSync('d:/Sports_Physio_Software/sports-health-hub-main/src/pages/ams/ExerciseLibrary.tsx', 'utf8');
const fixed = content.replace(/\\"/g, '"');
fs.writeFileSync('d:/Sports_Physio_Software/sports-health-hub-main/src/pages/ams/ExerciseLibrary.tsx', fixed);
console.log('Fixed ExerciseLibrary.tsx');
