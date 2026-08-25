import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

async function getAuthUserId(req: NextRequest): Promise<string | null> {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return null;
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return null;
        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
        return decoded?.userId || null;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const authUserId = await getAuthUserId(request);
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { consultationId, clientId } = body;

        // Validate required fields
        if (!consultationId || !clientId) {
            return NextResponse.json(
                { error: 'Missing required fields: consultationId, clientId' },
                { status: 400 }
            );
        }

        // Check if active access grant already exists
        const existingAccess = await prisma.accessGrant.findFirst({
            where: {
                request_id: consultationId,
                user_id: clientId,
                is_active: true,
                expires_at: { gt: new Date() }
            }
        });

        if (existingAccess) {
            return NextResponse.json({
                success: true,
                access: existingAccess,
                message: 'Access already granted'
            });
        }

        // Grant 24-hour access
        const now = new Date();
        const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const accessRecord = await prisma.accessGrant.upsert({
            where: { request_id: consultationId },
            update: {
                user_id: clientId,
                granted_at: now,
                expires_at: expirationDate,
                is_active: true,
            },
            create: {
                request_id: consultationId,
                user_id: clientId,
                granted_at: now,
                expires_at: expirationDate,
                is_active: true,
            },
        });

        return NextResponse.json({
            success: true,
            access: accessRecord,
            message: 'Access granted for 24 hours'
        });

    } catch (error) {
        console.error('Error granting access:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const consultationId = url.searchParams.get('consultationId');
        const clientId = url.searchParams.get('clientId');

        if (!consultationId || !clientId) {
            return NextResponse.json(
                { error: 'Missing consultationId or clientId' },
                { status: 400 }
            );
        }

        // Find active access for this consultation and client in PostgreSQL
        const access = await prisma.accessGrant.findFirst({
            where: {
                request_id: consultationId,
                user_id: clientId,
                is_active: true,
                expires_at: { gt: new Date() }
            }
        });

        if (!access) {
            return NextResponse.json({
                success: false,
                hasAccess: false,
                message: 'No active access found'
            });
        }

        return NextResponse.json({
            success: true,
            hasAccess: true,
            access,
            timeRemaining: new Date(access.expires_at).getTime() - Date.now()
        });

    } catch (error) {
        console.error('Error checking access:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
