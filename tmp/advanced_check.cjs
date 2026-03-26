const fs = require('fs');
const content = fs.readFileSync('d:\\Sports_Physio_Software\\sports-health-hub-main\\src\\pages\\admin\\ClientProfile.tsx', 'utf8');

function count(pattern) {
    return (content.match(pattern) || []).length;
}

const tags = [
    'DashboardLayout', 'div', 'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent', 'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'Button', 'Input', 'Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem', 'Badge', 'Label', 'Switch', 'User', 'History', 'ClipboardList', 'Shield', 'CreditCard', 'Settings', 'UserCheck', 'Download', 'FileText', 'Activity', 'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle'
];

tags.forEach(t => {
    const open = count(new RegExp(`<${t}\\b`, 'g'));
    const close = count(new RegExp(`</${t}>`, 'g'));
    const self = count(new RegExp(`<${t}\\b[^>]*/>`, 'g'));
    if (open !== close + self) {
        console.log(`${t}: Open=${open}, Close=${close}, Self=${self} (Diff: ${open - close - self})`);
    }
});

const openParens = count(/\(/g);
const closeParens = count(/\)/g);
console.log(`Parens: ( ${openParens}, ) ${closeParens} (Diff: ${openParens - closeParens})`);

const openBraces = count(/\{/g);
const closeBraces = count(/\}/g);
console.log(`Braces: { ${openBraces}, } ${closeBraces} (Diff: ${openBraces - closeBraces})`);
