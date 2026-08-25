import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { amount, currency = 'INR', receipt, notes } = body;

        if (!amount) {
            return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
        }

        // Amount in paise (if amount is passed in INR, ensure it's at least 1 INR / 100 paise)
        const amountInPaise = Number(amount) < 100 && Number(amount) > 0 ? Math.round(Number(amount) * 100) : Math.round(Number(amount));

        if (isNaN(amountInPaise) || amountInPaise < 100) {
            return NextResponse.json({
                error: 'Minimum order amount is 100 paise (₹1.00)'
            }, { status: 400 });
        }

        const key_id = process.env.RAZORPAY_KEY_ID;
        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_id || !key_secret) {
            return NextResponse.json({
                error: 'Razorpay credentials not configured on the server'
            }, { status: 500 });
        }

        const razorpay = new Razorpay({
            key_id,
            key_secret,
        });

        const receiptId = receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: currency.toUpperCase(),
            receipt: receiptId,
            notes: notes || {},
        });

        return NextResponse.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: key_id,
            receipt: order.receipt,
        });

    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to create Razorpay order'
        }, { status: 500 });
    }
}
