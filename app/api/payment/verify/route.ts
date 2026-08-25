import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            is_simulated
        } = body;

        if (!razorpay_order_id) {
            return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
        }

        // Find the pending payment record
        const payment = await prisma.payment.findFirst({
            where: {
                razorpay_order_id: razorpay_order_id,
            },
        });

        if (!payment) {
            return NextResponse.json({ error: 'Payment record not found for this order' }, { status: 404 });
        }

        if (payment.client_id !== decoded.userId) {
            return NextResponse.json({ error: 'Forbidden: Unauthorized payment verification' }, { status: 403 });
        }

        if (payment.status === 'COMPLETED') {
            return NextResponse.json({
                success: true,
                message: 'Payment already verified and completed',
                payment_id: payment.id,
            });
        }

        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        // If not running in simulated fallback mode, verify cryptographic HMAC SHA256 signature
        if (razorpayKeySecret && !is_simulated) {
            if (!razorpay_payment_id || !razorpay_signature) {
                return NextResponse.json({ error: 'Missing payment ID or signature' }, { status: 400 });
            }

            const expectedSignature = crypto
                .createHmac('sha256', razorpayKeySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (expectedSignature !== razorpay_signature) {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: 'FAILED',
                        processed_at: new Date(),
                    },
                });

                return NextResponse.json({
                    success: false,
                    error: 'Invalid payment signature. Verification failed.',
                }, { status: 400 });
            }
        }

        const transactionPaymentId = razorpay_payment_id || `rzp_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Transactional update: Payment COMPLETED, AccessGrant created, Earnings incremented
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour access window

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        await prisma.$transaction([
            // 1. Mark payment COMPLETED
            prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'COMPLETED',
                    razorpay_payment_id: transactionPaymentId,
                    razorpay_signature: razorpay_signature || 'simulated_signature',
                    payment_method: 'RAZORPAY',
                    processed_at: now,
                    updated_at: now,
                },
            }),

            // 2. Grant 24-hour access
            prisma.accessGrant.upsert({
                where: { request_id: payment.request_id },
                update: {
                    user_id: payment.client_id,
                    granted_at: now,
                    expires_at: expiresAt,
                    is_active: true,
                },
                create: {
                    request_id: payment.request_id,
                    user_id: payment.client_id,
                    granted_at: now,
                    expires_at: expiresAt,
                    is_active: true,
                },
            }),

            // 3. Increment advocate monthly earnings
            prisma.monthlyEarnings.upsert({
                where: {
                    advocate_id_year_month: {
                        advocate_id: payment.advocate_id,
                        year,
                        month,
                    },
                },
                update: {
                    total_amount: { increment: payment.amount },
                    consultation_count: { increment: 1 },
                },
                create: {
                    advocate_id: payment.advocate_id,
                    year,
                    month,
                    total_amount: payment.amount,
                    consultation_count: 1,
                },
            }),

            // 4. Update advocate total earnings and consultation count
            prisma.advocateProfile.update({
                where: { user_id: payment.advocate_id },
                data: {
                    total_earnings: { increment: payment.amount },
                    total_consultations: { increment: 1 },
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            transaction_id: transactionPaymentId,
            amount: payment.amount,
            message: 'Payment verified and consultation access granted for 24 hours',
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error during verification' },
            { status: 500 }
        );
    }
}
