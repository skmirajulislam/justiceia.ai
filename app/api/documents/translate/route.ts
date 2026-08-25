import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini } from '@/lib/gemini';
import { extractPDFText, extractPDFTextAdvanced } from '@/lib/pdfExtractor';

export async function POST(req: NextRequest) {
    try {
        const { fileContent, fileName, targetLanguage, apiKey } = await req.json();

        const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!fileContent || !targetLanguage) {
            return NextResponse.json(
                { error: 'File content and target language are required' },
                { status: 400 }
            );
        }

        if (!effectiveApiKey) {
            return NextResponse.json(
                { error: 'Gemini API key not configured on the server. Please provide an API key.', requiresApiKey: true },
                { status: 400 }
            );
        }

        // Extract text from PDF
        let documentText = '';
        try {
            console.log('Processing PDF file for translation:', fileName);

            // Convert base64 to ArrayBuffer
            const binaryString = atob(fileContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const arrayBuffer = bytes.buffer;

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

            const text = await generateWithGemini(effectiveApiKey, translationPrompt);

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