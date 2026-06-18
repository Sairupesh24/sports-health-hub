import fs from 'fs';

const prevWalkthroughPath = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\e2f1f80a-03a6-4079-a77d-175f54b036f6\\walkthrough.md";
const destPath = "d:\\Sports_Physio_Software\\sports-health-hub-main\\scratch\\walkthrough_prev.md";

try {
    if (fs.existsSync(prevWalkthroughPath)) {
        fs.copyFileSync(prevWalkthroughPath, destPath);
        console.log(`Successfully copied ${prevWalkthroughPath} to ${destPath}`);
        const text = fs.readFileSync(destPath, 'utf8');
        console.log("--- Content ---");
        console.log(text);
    } else {
        console.log("Previous walkthrough does not exist at path: " + prevWalkthroughPath);
    }
} catch (e) {
    console.log("Error:", e.message);
}
