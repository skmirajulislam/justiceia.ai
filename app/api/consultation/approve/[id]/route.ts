import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { RequestStatus } from '@/app/generated/prisma';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const token = request.cookies.get('auth-token')?.value;
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

        const params = await context.params;
        const requestId = params.id;

        // Fetch the consultation request
        const consultationRequest = await prisma.consultationRequest.findUnique({
            where: { id: requestId },
        });

        if (!consultationRequest) {
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // Verify that the logged-in user is the assigned advocate
        if (consultationRequest.advocate_id !== decoded.userId) {
            return NextResponse.json({ error: 'Forbidden: Only the assigned advocate can approve this request' }, { status: 403 });
        }

        // Update request status in PostgreSQL
        const updatedRequest = await prisma.consultationRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.APPROVED,
                updated_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Consultation request approved successfully',
            request: updatedRequest,
        });

    } catch (error) {
        console.error('Approve request error:', error);
        return NextResponse.json(
            { error: 'Failed to approve consultation request' },
            { status: 500 }
        );
    }
}
