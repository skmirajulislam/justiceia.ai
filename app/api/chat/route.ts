import { NextRequest, NextResponse } from 'next/server';
import { generateWithGemini } from '@/lib/gemini';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        let decoded: { userId: string };
        try {
            decoded = jwt.verify(token, jwtSecret) as { userId: string };
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: { vkyc_completed: true }
        });

        if (!profile?.vkyc_completed) {
            return NextResponse.json({ error: 'VKYC verification required to access AI Chatbot' }, { status: 403 });
        }

        const { message, history, customApiKey } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const apiKey = customApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({
                error: 'Gemini API key not configured. Please enter your API key to continue.',
                requiresApiKey: true
            }, { status: 400 });
        }

        const legalContext = `You are a knowledgeable legal AI assistant named Justiceia AI specializing in Indian law, constitutional law, procedural codes (IPC/BNS, CrPC/BNSS, CPC), corporate compliance, and general legal principles.
You provide helpful, precise, and professional legal guidance.
Always maintain a professional tone and provide practical legal insights.

User question: ${message}`;

        const responseText = await generateWithGemini(apiKey, legalContext);

        return NextResponse.json({
            success: true,
            reply: responseText,
        });

    } catch (error: any) {
        console.error('Chat API error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to process AI request',
        }, { status: 500 });
    }
}
