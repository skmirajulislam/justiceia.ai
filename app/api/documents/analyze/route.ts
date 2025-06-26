import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractPDFText, extractPDFTextAdvanced } from '@/lib/pdfExtractor';

export async function POST(req: NextRequest) {
    try {
        const { fileContent, fileName, apiKey } = await req.json();

        if (!fileContent || !apiKey) {
            return NextResponse.json(
                { error: 'File content and API key are required' },
                { status: 400 }
            );
        }

        // Extract text from PDF
        let documentText = '';
        try {
            console.log('Processing PDF file:', fileName);

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

        // Analyze with AI
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const analysisPrompt = `You are a professional legal document analyzer. Please analyze the following document and provide a comprehensive legal analysis.

DOCUMENT CONTENT:
${documentText}

Please provide your analysis in the following JSON format:

{
    "documentType": "type of legal document (e.g., Contract, Agreement, Notice, etc.)",
    "summary": "brief summary of the document's purpose and main content",
    "keyPoints": [
        "list of key points, terms, and important clauses mentioned in the document",
        "include specific dates, amounts, obligations, rights mentioned",
        "highlight important legal provisions and conditions"
    ],
    "legalConcerns": [
        "potential legal issues or risks identified in the document",
        "ambiguous terms that need clarification",
        "missing clauses or provisions that should be included",
        "compliance concerns with applicable laws"
    ],
    "recommendations": [
        "specific recommendations to improve the document",
        "suggestions for legal compliance",
        "recommendations for risk mitigation",
        "advice for parties involved"
    ]
}

ANALYSIS REQUIREMENTS:
- Focus on the actual content of the document provided
- Identify specific terms, conditions, and obligations mentioned
- Highlight any dates, monetary amounts, or deadlines
- Point out potential legal risks based on the document content
- Provide actionable recommendations
- Be specific and avoid generic responses
- Base analysis entirely on the document content provided

Ensure your analysis is thorough, professional, and directly related to the document content.`;

            const result = await model.generateContent(analysisPrompt);
            const response = result.response;
            const text = response.text();

            try {
                const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
                const analysis = JSON.parse(cleanedText);

                return NextResponse.json({
                    analysis: {
                        documentType: analysis.documentType || 'Legal Document',
                        summary: analysis.summary || 'Document analysis completed.',
                        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
                        legalConcerns: Array.isArray(analysis.legalConcerns) ? analysis.legalConcerns : [],
                        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : []
                    }
                });

            } catch (parseError) {
                console.error('JSON parsing error:', parseError);

                // Fallback analysis
                return NextResponse.json({
                    analysis: {
                        documentType: 'Legal Document',
                        summary: 'Document content was extracted successfully but requires manual analysis.',
                        keyPoints: [
                            'Document uploaded and processed',
                            'Text content extracted from PDF',
                            'Manual review recommended for detailed insights'
                        ],
                        legalConcerns: [
                            'Automated analysis could not be completed',
                            'Professional legal review recommended'
                        ],
                        recommendations: [
                            'Have document reviewed by qualified legal counsel',
                            'Verify all terms and conditions manually',
                            'Ensure compliance with applicable laws'
                        ]
                    }
                });
            }

        } catch (aiError: any) {
            console.error('AI analysis error:', aiError);
            return NextResponse.json(
                { error: 'Failed to analyze document with AI. Please check your API key and try again.' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Document analysis error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze document. Please try again.' },
            { status: 500 }
        );
    }
}