// Linear, safe PDF text extraction without polynomial regular expressions
export async function extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        // Try advanced PDF extraction using pdfjs-dist first
        try {
            const advancedText = await extractPDFTextAdvanced(arrayBuffer);
            if (advancedText && advancedText.length > 20) {
                return advancedText;
            }
        } catch {
            // Fallback to safe linear byte scanner
        }

        const data = new Uint8Array(arrayBuffer);
        const textChunks: string[] = [];
        let inParentheses = false;
        let currentChunk: number[] = [];
        let escapeNext = false;

        // Linear O(N) single-pass token scanner (no ReDoS / polynomial backtracking)
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];

            if (escapeNext) {
                if (byte === 110) { // 'n' -> newline
                    currentChunk.push(10);
                } else if (byte === 114) { // 'r' -> carriage return
                    currentChunk.push(13);
                } else if (byte === 116) { // 't' -> tab
                    currentChunk.push(9);
                } else {
                    currentChunk.push(byte);
                }
                escapeNext = false;
                continue;
            }

            if (byte === 92) { // '\'
                if (inParentheses) {
                    escapeNext = true;
                }
                continue;
            }

            if (byte === 40) { // '('
                inParentheses = true;
                currentChunk = [];
            } else if (byte === 41) { // ')'
                if (inParentheses) {
                    inParentheses = false;
                    if (currentChunk.length > 0) {
                        const str = String.fromCharCode(...currentChunk);
                        if (/[\w\s]/.test(str)) {
                            textChunks.push(str);
                        }
                        currentChunk = [];
                    }
                }
            } else if (inParentheses) {
                currentChunk.push(byte);
            }
        }

        const extractedText = textChunks
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        return extractedText.length > 10 ? extractedText : 'No readable text found in PDF';

    } catch (error) {
        console.error('PDF text extraction error:', error);
        return 'Failed to extract text from PDF';
    }
}

// Advanced PDF.js text extraction
export async function extractPDFTextAdvanced(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        pdfjsLib.GlobalWorkerOptions.workerSrc = '';

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true,
            disableFontFace: true,
            verbosity: 0
        });

        const pdf = await loadingTask.promise;
        const pages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => {
                        if ('str' in item && typeof item.str === 'string') {
                            return item.str;
                        }
                        return '';
                    })
                    .filter(Boolean)
                    .join(' ');

                if (pageText.trim()) {
                    pages.push(pageText.trim());
                }
            } catch (pageError) {
                console.warn(`Error extracting text from page ${i}:`, pageError);
                continue;
            }
        }

        await pdf.destroy();
        return pages.join('\n\n').trim();

    } catch (error) {
        console.error('Advanced PDF extraction error:', error);
        throw error;
    }
}