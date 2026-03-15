const pdf = require('pdf-parse');

const extractTextFromPDF = async (buffer) => {
    try {
        const data = await pdf(buffer, {
            max: 0,
            version: 'default'
        });
        
        if (!data || !data.text || data.text.trim().length === 0) {
            console.error('No text content extracted from PDF');
            return null;
        }
        
        let cleanedText = data.text.trim();
        cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
        cleanedText = cleanedText.replace(/[ \t]+/g, ' ');
        
        console.log('Extracted text length:', cleanedText.length);
        
        return cleanedText;
    } catch (error) {
        console.error('PDF extraction error:', error.message);
        return null;
    }
};

module.exports = { extractTextFromPDF };