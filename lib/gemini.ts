import { GoogleGenerativeAI } from '@google/generative-ai';

const CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
];

export async function generateWithGemini(
    apiKey: string,
    promptOrParts: string | any[],
    systemInstruction?: string
): Promise<string> {
    const cleanApiKey = (apiKey || '').replace(/^['"]|['"]$/g, '').trim();

    if (!cleanApiKey) {
        throw new Error('Gemini API key is missing or empty.');
    }

    const genAI = new GoogleGenerativeAI(cleanApiKey);
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
        } catch (sdkErr: any) {
            console.warn(`SDK with ${modelName} failed, trying REST fallback:`, sdkErr.message);

            // Direct REST API Fallback
            try {
                const contents = typeof promptOrParts === 'string'
                    ? [{ parts: [{ text: promptOrParts }] }]
                    : promptOrParts;

                const bodyPayload: any = { contents };
                if (systemInstruction) {
                    bodyPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
                }

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 20000);

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanApiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bodyPayload),
                        signal: controller.signal,
                    }
                );
                clearTimeout(timeout);

                if (res.ok) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                        return text;
                    }
                } else {
                    const errData = await res.json().catch(() => ({}));
                    console.warn(`REST fallback ${modelName} returned ${res.status}:`, errData);
                    lastError = new Error(errData?.error?.message || `HTTP ${res.status}`);
                }
            } catch (restErr: any) {
                console.warn(`REST error for ${modelName}:`, restErr.message);
                lastError = restErr;
            }
        }
    }

    throw lastError || new Error('All Gemini model candidates failed to generate a response');
}
