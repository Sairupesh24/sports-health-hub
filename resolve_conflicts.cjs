const fs = require('fs');
const path = require('path');

function resolveConflictsInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex explanation:
    // Match <<<<<<< HEAD\n
    // Match (.*?)\n (non-greedy, the HEAD content we want to keep)
    // Match =======\n
    // Match (.*?)\n (non-greedy, the incoming content we want to discard)
    // Match >>>>>>> [commit hash or text]\n
    
    const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>>[^\n]*\r?\n?/g;
    
    if (conflictRegex.test(content)) {
        console.log(`Resolving conflicts in: ${filePath}`);
        // Replace the entire conflict block with just the capture group 1 (the HEAD content)
        content = content.replace(conflictRegex, '$1');
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }
    return false;
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    let resolvedCount = 0;
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            resolvedCount += walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.json')) {
            if (resolveConflictsInFile(fullPath)) {
                resolvedCount++;
            }
        }
    }
    return resolvedCount;
}

const srcDir = path.join(__dirname, 'src');
console.log(`Scanning for conflicts in ${srcDir}...`);
const totalResolved = walkDir(srcDir);
console.log(`Completed resolving conflicts in ${totalResolved} files.`);
