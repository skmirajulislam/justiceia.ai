import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractPDFText, extractPDFTextAdvanced } from '@/lib/pdfExtractor';

export async function POST(req: NextRequest) {
    try {
        const { documentUrl, fileName, targetLanguage, apiKey } = await req.json();

        if (!documentUrl || !targetLanguage || !apiKey) {
            return NextResponse.json(
                { error: 'Document URL, target language, and API key are required' },
                { status: 400 }
            );
        }

        // Extract text from PDF
        let documentText = '';
        try {
            console.log('Fetching document from:', documentUrl);

            const response = await fetch(documentUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Cache-Control': 'no-cache'
                }
            });

            console.log('Response status:', response.status, response.statusText);

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();

            if (arrayBuffer.byteLength === 0) {
                throw new Error('Empty PDF file received');
            }

            console.log('PDF size:', arrayBuffer.byteLength, 'bytes');

            // Check PDF header
            const header = new Uint8Array(arrayBuffer.slice(0, 5));
            const pdfHeader = String.fromCharCode(...header);
            if (!pdfHeader.startsWith('%PDF')) {
                throw new Error('File is not a valid PDF document');
            }

            // Try simple extraction first
            console.log('Attempting simple PDF extraction...');
            documentText = await extractPDFText(arrayBuffer);

            // If simple extraction didn't work well, try advanced method
            if (!documentText || documentText.length < 50 || documentText.includes('No readable text found')) {
                console.log('Simple extraction failed, trying advanced method...');
                try {
                    documentText = await extractPDFTextAdvanced(arrayBuffer);
                } catch (advancedError) {
                    console.warn('Advanced extraction also failed:', advancedError);
                    // Keep the simple extraction result
                }
            }

            console.log('Final extracted text length:', documentText.length);
            console.log('Text preview:', documentText.substring(0, 200) + '...');

            if (!documentText || documentText.trim().length < 10) {
                throw new Error('No readable text found in the PDF. This might be a scanned document or image-based PDF that requires OCR.');
            }

        } catch (extractError: any) {
            console.error('PDF extraction error:', extractError);
            return NextResponse.json(
                { error: `Failed to process PDF: ${extractError.message}` },
                { status: 400 }
            );
        }

        // Translate with AI
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const languageMap = {
                'english': 'English',
                'bengali': 'Bengali',
                'hindi': 'Hindi',
                'telugu': 'Telugu',
                'tamil': 'Tamil',
                'spanish': 'Spanish',
                'chinese': 'Chinese (Simplified)',
                'french': 'French',
                'german': 'German'
            };

            const targetLangName = languageMap[targetLanguage as keyof typeof languageMap] || targetLanguage;

            const translationPrompt = `You are a professional document translator specializing in legal and business documents.

Please translate the following document text into ${targetLangName}:

DOCUMENT TEXT:
${documentText}

TRANSLATION REQUIREMENTS:
1. **Target Language**: ${targetLangName}
2. **Maintain Document Structure**: Keep all formatting, sections, and layout
3. **Legal Accuracy**: Ensure legal terms are translated accurately
4. **Cultural Context**: Adapt content appropriately for the target language
5. **Professional Tone**: Maintain formal, professional language

Please provide your response in the following JSON format:

{
    "originalLanguage": "detected language of the source document",
    "translatedContent": "complete translated document content preserving formatting and structure"
}

IMPORTANT GUIDELINES:
- Preserve all section headers, numbering, and bullet points
- Translate legal terms accurately while maintaining their legal meaning
- Keep proper names, company names, and technical terms in their original form where appropriate
- Maintain professional legal document formatting
- If certain legal terms don't have direct translations, include the original term in parentheses

Ensure the translation is accurate, professional, and legally sound for ${targetLangName} speakers.`;

            const result = await model.generateContent(translationPrompt);
            const response = result.response;
            const text = response.text();

            try {
                const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
                const translation = JSON.parse(cleanedText);

                return NextResponse.json({
                    originalLanguage: translation.originalLanguage || 'Auto-detected',
                    translatedContent: translation.translatedContent || text
                });

            } catch (parseError) {
                console.error('JSON parsing error:', parseError);

                return NextResponse.json({
                    originalLanguage: 'Auto-detected',
                    translatedContent: text
                });
            }

        } catch (aiError: any) {
            console.error('AI translation error:', aiError);
            return NextResponse.json(
                { error: 'Failed to translate document with AI. Please check your API key and try again.' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Document translation error:', error);
        return NextResponse.json(
            { error: 'Failed to translate document. Please try again.' },
            { status: 500 }
        );
    }
}