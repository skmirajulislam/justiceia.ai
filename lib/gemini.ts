import { GoogleGenerativeAI } from '@google/generative-ai';

const CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-pro',
];

export async function generateWithGemini(
    apiKey: string,
    promptOrParts: string | any[],
    systemInstruction?: string
): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
            });

            const result = await model.generateContent(promptOrParts);
            const responseText = result.response.text();
            if (responseText) {
                return responseText;
            }
        } catch (err: any) {
            console.warn(`Gemini model ${modelName} failed, attempting next model:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error('All Gemini model candidates failed to generate a response');
}
