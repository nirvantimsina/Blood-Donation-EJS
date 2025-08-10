const Tesseract = require('tesseract.js');

async function extractTextFromImage(imagePath) {
    try {
        const result = await Tesseract.recognize(
            imagePath,
            'eng'
        );
        return result.data.text; 
    } catch (error) {
        console.error('Error in OCR:', error);
        throw new Error('Error extracting text from image');
    }
}

module.exports = { extractTextFromImage };
