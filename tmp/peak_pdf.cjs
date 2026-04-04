const pdfjsLib = require('pdfjs-dist');

async function peakPdf() {
    try {
        const loadingTask = pdfjsLib.getDocument('d:/Sports_Physio_Software/sports-health-hub-main/Sreeja Akula.pdf');
        const pdf = await loadingTask.promise;
        console.log(`PDF loaded. Total pages: ${pdf.numPages}`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            console.log(`--- Page ${i} ---`);
            console.log(text.substring(0, 500) + '...');
        }
    } catch (err) {
        console.error('Error peaking PDF:', err);
    }
}

peakPdf();
