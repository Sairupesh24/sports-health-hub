const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/Sports_Physio_Software/sports-health-hub-main';

function findRecentFiles(dir, filesList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.svelte-kit' || file === '.astro') continue;
        const filePath = path.join(dir, file);
        try {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                findRecentFiles(filePath, filesList);
            } else {
                // Check if modified in the last 2 hours
                const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
                if (ageHours < 2) {
                    filesList.push({ path: filePath, mtime: stat.mtime, size: stat.size });
                }
            }
        } catch (e) {
            // Ignore errors
        }
    }
    return filesList;
}

const recent = findRecentFiles(projectRoot);
recent.sort((a, b) => b.mtime - a.mtime);
console.log("Recent files modified in the last 2 hours:");
recent.forEach(f => console.log(`${f.path} - ${f.mtime} - ${f.size} bytes`));
