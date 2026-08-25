import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { type, title, description, apiKey } = await req.json();

        const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!type || !title || !description) {
            return NextResponse.json(
                { error: 'Type, title, and description are required' },
                { status: 400 }
            );
        }

        if (!effectiveApiKey) {
            return NextResponse.json(
                { error: 'Gemini API key not configured on the server. Please provide an API key.', requiresApiKey: true },
                { status: 400 }
            );
        }

        // Document type specific prompts
        const documentTemplates = {
            contract: 'a comprehensive contract agreement',
            nda: 'a non-disclosure agreement (NDA)',
            employment: 'an employment agreement contract',
            rental: 'a rental/lease agreement',
            service: 'a service agreement contract',
            partnership: 'a partnership agreement',
            terms: 'terms of service document',
            privacy: 'a privacy policy document',
            invoice: 'a legal invoice template',
            notice: 'a legal notice document'
        };

        const documentTemplate = documentTemplates[type as keyof typeof documentTemplates] || 'a legal document';

        const generationPrompt = `You are a professional legal document writer. Generate ${documentTemplate} with the following details:

Title: ${title}
Requirements: ${description}

Please create a comprehensive, professional legal document that includes:

1. **Proper legal document structure and formatting**
2. **Clear and precise legal language**
3. **All necessary clauses and provisions**
4. **Appropriate legal disclaimers**
5. **Professional presentation**

**IMPORTANT REQUIREMENTS:**
- Use formal legal language and terminology
- Include all standard clauses for this type of document
- Make placeholders for specific details (like [PARTY NAME], [DATE], [AMOUNT], etc.)
- Ensure the document is legally sound and professional
- Include appropriate legal disclaimers
- Structure the document with proper sections and numbering
- Add signature blocks and date fields where appropriate

**Document Structure:**
- Title/Header
- Parties involved
- Purpose/Recitals
- Terms and Conditions
- Rights and Obligations
- Termination clauses
- Governing law
- Signatures

Generate a complete, ready-to-use legal document that follows industry standards and best practices. The document should be comprehensive and professional.`;

        const content = await generateWithGemini(effectiveApiKey, generationPrompt);

        // Clean up the content
        const cleanContent = content
            .replace(/```/g, '')
            .replace(/^\s*markdown\s*/i, '')
            .trim();

        return NextResponse.json({ content: cleanContent });

    } catch (error) {
        console.error('Document generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate document' },
            { status: 500 }
        );
    }
}