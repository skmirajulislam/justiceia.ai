import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const identifier = params.id;

        // Find the payment record by ID, razorpay_order_id, or stripe_session_id
        const payment = await prisma.payment.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { razorpay_order_id: identifier },
                    { stripe_session_id: identifier },
                ]
            },
        });

        if (!payment) {
            return NextResponse.json({
                error: 'Payment record not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            payment: {
                id: payment.id,
                order_id: payment.razorpay_order_id || payment.stripe_session_id,
                amount: payment.amount,
                status: payment.status,
                payment_method: payment.payment_method || 'RAZORPAY',
                transaction_id: payment.razorpay_payment_id || payment.stripe_payment_id,
                processed_at: payment.processed_at,
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
