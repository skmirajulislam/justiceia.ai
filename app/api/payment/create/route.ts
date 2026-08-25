import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Razorpay from 'razorpay';
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
        const { request_id } = body;

        if (!request_id) {
            return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
        }

        // Get the consultation request
        const consultationRequest = await prisma.consultationRequest.findUnique({
            where: { id: request_id },
        });

        if (!consultationRequest) {
            return NextResponse.json({ error: 'Consultation request not found' }, { status: 404 });
        }

        // Verify that the logged-in user is the client
        if (consultationRequest.client_id !== decoded.userId) {
            return NextResponse.json({ error: 'Forbidden: You cannot pay for another user\'s consultation' }, { status: 403 });
        }

        // Check if request is approved
        if (consultationRequest.status !== 'APPROVED') {
            return NextResponse.json({
                error: 'Request must be approved by the advocate before payment'
            }, { status: 400 });
        }

        // Check if payment already completed
        const existingPayment = await prisma.payment.findUnique({
            where: { request_id: consultationRequest.id },
        });

        if (existingPayment && existingPayment.status === 'COMPLETED') {
            return NextResponse.json({
                error: 'Payment already completed for this consultation'
            }, { status: 400 });
        }

        const advocate = await prisma.profile.findUnique({
            where: { id: consultationRequest.advocate_id },
            select: { first_name: true, last_name: true, email: true }
        });

        const client = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: { first_name: true, last_name: true, email: true, phone: true }
        });

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let isSimulated = false;

        if (razorpayKeyId && razorpayKeySecret) {
            try {
                const razorpay = new Razorpay({
                    key_id: razorpayKeyId,
                    key_secret: razorpayKeySecret,
                });

                const amountInPaise = Math.round(consultationRequest.amount * 100);

                const razorpayOrder = await razorpay.orders.create({
                    amount: amountInPaise,
                    currency: 'INR',
                    receipt: `rcpt_${consultationRequest.id.substring(0, 10)}`,
                    notes: {
                        request_id: consultationRequest.id,
                        client_id: consultationRequest.client_id,
                        advocate_id: consultationRequest.advocate_id,
                    },
                });

                orderId = razorpayOrder.id;
            } catch (rzpError) {
                console.warn('Razorpay API error, falling back to sandbox mode:', rzpError);
                isSimulated = true;
            }
        } else {
            console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set, using simulated order');
            isSimulated = true;
        }

        // Upsert payment record
        const payment = await prisma.payment.upsert({
            where: { request_id: consultationRequest.id },
            update: {
                amount: consultationRequest.amount,
                razorpay_order_id: orderId,
                status: 'PENDING',
                payment_method: 'razorpay',
                updated_at: new Date()
            },
            create: {
                request_id: consultationRequest.id,
                client_id: consultationRequest.client_id,
                advocate_id: consultationRequest.advocate_id,
                amount: consultationRequest.amount,
                razorpay_order_id: orderId,
                status: 'PENDING',
                payment_method: 'razorpay',
            },
        });

        return NextResponse.json({
            success: true,
            payment_id: payment.id,
            order_id: orderId,
            amount: consultationRequest.amount,
            currency: 'INR',
            key_id: razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock_key',
            advocate_name: `${advocate?.first_name || ''} ${advocate?.last_name || ''}`.trim() || 'Advocate',
            client_name: `${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
            client_email: client?.email || '',
            client_phone: client?.phone || '',
            description: consultationRequest.description || consultationRequest.title,
            is_simulated: isSimulated,
        });

    } catch (error) {
        console.error('Error creating Razorpay payment order:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
