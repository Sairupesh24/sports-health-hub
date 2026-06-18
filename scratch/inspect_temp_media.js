import fs from 'fs';
import path from 'path';

const tempMediaDir = "C:\\Users\\kavut\\.gemini\\antigravity\\brain\\5c50d2a2-55c6-41a7-8cc5-e07e65517710\\.tempmediaStorage";

// Very basic helper to get dimensions from PNG and JPEG headers
function getImageInfo(filePath) {
    const buffer = fs.readFileSync(filePath);
    
    // Check signatures
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        // PNG
        const width = buffer.readInt32BE(16);
        const height = buffer.readInt32BE(20);
        return { type: 'PNG', width, height };
    } else if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        // JPEG - read SOF marker
        let offset = 2;
        while (offset < buffer.length) {
            const marker = buffer.readUInt16BE(offset);
            offset += 2;
            if (marker === 0xFFC0 || marker === 0xFFC2) { // SOF0 or SOF2
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

fs.readdirSync(tempMediaDir).forEach(file => {
    const filePath = path.join(tempMediaDir, file);
    if (fs.statSync(filePath).isFile()) {
        try {
            const info = getImageInfo(filePath);
            console.log(`${file}: sizeBytes=${fs.statSync(filePath).size}, type=${info.type}, width=${info.width}, height=${info.height}`);
        } catch (e) {
            console.log(`${file}: error ${e.message}`);
        }
    }
});
