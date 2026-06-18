import fs from 'fs';

function getPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readInt32BE(16);
        const height = buffer.readInt32BE(20);
        return { width, height };
    }
    return null;
}

const dims = getPngDimensions('d:\\Sports_Physio_Software\\sports-health-hub-main\\public\\anatomy_heatmap_bg.png');
console.log("anatomy_heatmap_bg.png dimensions:", dims);

const dimsGrayscale = getPngDimensions('d:\\Sports_Physio_Software\\sports-health-hub-main\\public\\anatomy_heatmap_bg_grayscale.png');
console.log("anatomy_heatmap_bg_grayscale.png dimensions:", dimsGrayscale);
