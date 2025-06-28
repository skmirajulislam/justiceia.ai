import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { request_id } = body;

        // Get the consultation request
        const consultationRequest = await prisma.consultationRequest.findUnique({
            where: { id: request_id },
        });

        if (!consultationRequest) {
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // Get advocate info
        const advocate = await prisma.profile.findUnique({
            where: { id: consultationRequest.advocate_id },
            include: { advocateProfile: true },
        });

        // Check if payment already exists
        const existingPayment = await prisma.payment.findUnique({
            where: { request_id: consultationRequest.id },
        });

        if (existingPayment) {
            return NextResponse.json({
                error: 'Payment already exists for this request'
            }, { status: 400 });
        }

        // Check if request is approved
        if (consultationRequest.status !== 'APPROVED') {
            return NextResponse.json({
                error: 'Request must be approved before payment'
            }, { status: 400 });
        }

        // Generate fake session ID for tracking
        const fakeSessionId = `fake_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create payment record for fake payment system
        const payment = await prisma.payment.create({
            data: {
                request_id: consultationRequest.id,
                client_id: consultationRequest.client_id,
                advocate_id: consultationRequest.advocate_id,
                amount: consultationRequest.amount,
                stripe_session_id: fakeSessionId, // Reusing this field for our fake session ID
                status: 'PENDING',
                payment_method: 'fake_payment_system',
            },
        });

        // Return fake payment data that frontend can use
        return NextResponse.json({
            success: true,
            payment_id: payment.id,
            session_id: fakeSessionId,
            amount: consultationRequest.amount,
            currency: 'INR',
            advocate_name: `${advocate?.first_name || ''} ${advocate?.last_name || ''}`.trim(),
            description: consultationRequest.description,
            is_fake_payment: true, // Flag to indicate this is fake
        });

    } catch (error) {
        console.error('Error creating fake payment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
