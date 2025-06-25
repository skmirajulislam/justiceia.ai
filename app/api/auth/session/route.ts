import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/integrations/client';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ session: null });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

        // Fetch fresh user data from database
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                vkyc_completed: true
            }
        });

        if (!profile) {
            return NextResponse.json({ session: null });
        }

        // Create session object with fresh data
        const session = {
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
                vkyc_completed: profile.vkyc_completed
            }
        };

        return NextResponse.json({ session });

    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ session: null }, { status: 500 });
    }
}