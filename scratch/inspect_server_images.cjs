const fs = require('fs');
const path = require('path');

const uploadsDir = 'd:/Sports_Physio_Software/sports-health-hub-main/server/public/uploads';

function getImageInfo(filename) {
    const filePath = path.join(uploadsDir, filename);
    const buffer = fs.readFileSync(filePath);
    
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readInt32BE(16);
        const height = buffer.readInt32BE(20);
        return { type: 'PNG', width, height };
    } else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        let offset = 2;
        while (offset < buffer.length) {
            const marker = buffer.readUInt16BE(offset);
            offset += 2;
            if (marker === 0xFFC0 || marker === 0xFFC2) {
                const height = buffer.readUInt16BE(offset + 3);
                const width = buffer.readUInt16BE(offset + 5);
                return { type: 'JPEG', width, height };
            }
            const length = buffer.readUInt16BE(offset);
            offset += length;
        }
        return { type: 'JPEG', error: 'No SOF marker found' };
    }
    return { type: 'Unknown' };
}

fs.readdirSync(uploadsDir).forEach(file => {
    const filePath = path.join(uploadsDir, file);
    if (fs.statSync(filePath).isFile()) {
        try {
            const info = getImageInfo(file);
            console.log(`${file}: sizeBytes=${fs.statSync(filePath).size}, type=${info.type}, width=${info.width}, height=${info.height}`);
        } catch (e) {
            console.log(`${file}: error ${e.message}`);
        }
    }
});
