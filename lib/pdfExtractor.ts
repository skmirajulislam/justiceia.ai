// Simple PDF text extraction without external dependencies
export async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        const data = new Uint8Array(arrayBuffer);
        const pdfString = Array.from(data, byte => String.fromCharCode(byte)).join('');

        // Method 1: Extract text from PDF streams
        let extractedText = '';

        // Look for text objects in PDF
        const textRegex = /BT\s*(.*?)\s*ET/g;
        const textMatches = pdfString.match(textRegex) || [];

        for (const match of textMatches) {
            // Extract text from within parentheses
            const textContent = match.match(/\((.*?)\)/g) || [];
            for (const text of textContent) {
                const cleanText = text.slice(1, -1) // Remove parentheses
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"');
                extractedText += cleanText + ' ';
            }
        }

        // Method 2: Look for Tj and TJ operators
        if (extractedText.length < 50) {
            const tjRegex = /\((.*?)\)\s*Tj/g;
            let match;
            while ((match = tjRegex.exec(pdfString)) !== null) {
                extractedText += match[1] + ' ';
            }
        }

        // Method 3: Extract from font mappings and content streams
        if (extractedText.length < 50) {
            const streamRegex = /stream\s*(.*?)\s*endstream/g;
            const streams = pdfString.match(streamRegex) || [];

            for (const stream of streams) {
                const textMatches = stream.match(/\((.*?)\)/g) || [];
                for (const text of textMatches) {
                    const cleanText = text.slice(1, -1);
                    if (cleanText.length > 2 && /[a-zA-Z]/.test(cleanText)) {
                        extractedText += cleanText + ' ';
                    }
                }
            }
        }

        // Clean up the extracted text
        extractedText = extractedText
            .replace(/\s+/g, ' ')
            .trim();

        return extractedText.length > 10 ? extractedText : 'No readable text found in PDF';

    } catch (error) {
        console.error('PDF text extraction error:', error);
        return 'Failed to extract text from PDF';
    }
}

// Advanced PDF.js text extraction (fallback)
export async function extractPDFTextAdvanced(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        // Disable worker for server-side usage  
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0
        });

        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => {
                        if ('str' in item) {
                            return item.str;
                        }
                        return '';
                    })
                    .join(' ');

                fullText += pageText + '\n';
            } catch (pageError) {
                console.warn(`Error extracting text from page ${i}:`, pageError);
                continue;
            }
        }

        await pdf.destroy();
        return fullText.trim();

    } catch (error) {
        console.error('Advanced PDF extraction error:', error);
        throw error;
    }
}