import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const sessionId = params.id;

        // Find the payment record
        const payment = await prisma.payment.findFirst({
            where: {
                stripe_session_id: sessionId, // Using this field for our fake session ID
            },
        });

        if (!payment) {
            return NextResponse.json({
                error: 'Payment session not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                session_id: payment.stripe_session_id,
                amount: payment.amount,
                status: payment.status,
                payment_method: payment.payment_method,
                transaction_id: payment.stripe_payment_id,
                processed_at: payment.processed_at,
                is_fake_payment: true
            }
        });

    } catch (error) {
        console.error('Error fetching payment status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
