import { NextRequest, NextResponse } from 'next/server';

interface PaymentRecord {
    id: string;
    consultationId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed';
    clientId: string;
    advocateId: string;
    consultationType: 'video' | 'chat';
    createdAt: string;
    completedAt?: string;
    transactionId?: string;
}

// This should be the same array as in create/route.ts
// In a real app, this would be in a database
const payments: PaymentRecord[] = [];

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const paymentId = params.id;
        const paymentIndex = payments.findIndex(p => p.id === paymentId);

        if (paymentIndex === -1) {
            return NextResponse.json(
                { error: 'Payment not found' },
                { status: 404 }
            );
        }

        const payment = payments[paymentIndex];

        if (payment.status !== 'pending') {
            return NextResponse.json(
                { error: 'Payment already processed' },
                { status: 400 }
            );
        }

        // Simulate payment processing
        // In a real app, this would integrate with payment gateway
        const success = Math.random() > 0.1; // 90% success rate for demo

        if (success) {
            payments[paymentIndex].status = 'completed';
            payments[paymentIndex].completedAt = new Date().toISOString();
            payments[paymentIndex].transactionId = `txn_${Date.now()}`;
        } else {
            payments[paymentIndex].status = 'failed';
        }

        return NextResponse.json({
            success,
            payment: payments[paymentIndex],
            message: success ? 'Payment completed successfully' : 'Payment failed'
        });

    } catch (error) {
        console.error('Error processing payment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const paymentId = params.id;
        const payment = payments.find(p => p.id === paymentId);

        if (!payment) {
            return NextResponse.json(
                { error: 'Payment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            payment
        });

    } catch (error) {
        console.error('Error fetching payment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
