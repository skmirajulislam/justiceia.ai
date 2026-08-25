import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

        if (webhookSecret && signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.error('Invalid Razorpay webhook signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
            }
        }

        const payload = JSON.parse(rawBody);
        const event = payload.event;

        if (event === 'payment.captured' || event === 'order.paid') {
            const paymentEntity = payload.payload?.payment?.entity;
            const orderId = paymentEntity?.order_id;
            const paymentId = paymentEntity?.id;

            if (orderId) {
                const payment = await prisma.payment.findFirst({
                    where: { razorpay_order_id: orderId },
                });

                if (payment && payment.status !== 'COMPLETED') {
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    const month = now.getMonth() + 1;
                    const year = now.getFullYear();

                    await prisma.$transaction([
                        prisma.payment.update({
                            where: { id: payment.id },
                            data: {
                                status: 'COMPLETED',
                                razorpay_payment_id: paymentId,
                                processed_at: now,
                                updated_at: now,
                            },
                        }),
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
                        prisma.advocateProfile.update({
                            where: { user_id: payment.advocate_id },
                            data: {
                                total_earnings: { increment: payment.amount },
                                total_consultations: { increment: 1 },
                            },
                        }),
                    ]);
                }
            }
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error) {
        console.error('Razorpay webhook processing error:', error);
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
    }
}
