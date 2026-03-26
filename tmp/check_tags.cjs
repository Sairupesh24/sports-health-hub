const fs = require('fs');
const content = fs.readFileSync('d:\\Sports_Physio_Software\\sports-health-hub-main\\src\\pages\\admin\\ClientProfile.tsx', 'utf8');

const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

console.log(`Braces: { ${openBraces}, } ${closeBraces} (Diff: ${openBraces - closeBraces})`);
console.log(`Parens: ( ${openParens}, ) ${closeParens} (Diff: ${openParens - closeParens})`);

// Very basic tag counter
const openTags = (content.match(/<[a-zA-Z0-9]+/g) || []).length;
const closeTags = (content.match(/<\/[a-zA-Z0-9]+/g) || []).length;
const selfClosingTags = (content.match(/\/>/g) || []).length;

console.log(`Tags: < ${openTags}, </ ${closeTags}, /> ${selfClosingTags}`);
console.log(`Unclosed: ${openTags - closeTags - selfClosingTags}`);
