const mammoth = require('mammoth');
const fs = require('fs');

async function testFile() {
    const filePath = 'd:/Sports_Physio_Software/sports-health-hub-main/CSSH - MSK Assessment Interpretation Summary.dotx';
    try {
        const result = await mammoth.extractRawText({path: filePath});
        console.log("--- Extracted Raw Text ---");
        console.log(result.value);
        console.log("--- Messages ---");
        console.log(result.messages);
        
        const htmlResult = await mammoth.convertToHtml({path: filePath});
        console.log("--- Extracted HTML ---");
        console.log(htmlResult.value);
    } catch (err) {
        console.error("Error processing DOTX:", err);
    }
}

testFile();
