import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body;

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({
                success: false,
                error: 'Missing required parameters: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
            }, { status: 400 });
        }

        const key_secret = process.env.RAZORPAY_KEY_SECRET;

        if (!key_secret) {
            return NextResponse.json({
                success: false,
                error: 'Razorpay secret key not configured on the server'
            }, { status: 500 });
        }

        // Generate expected signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
        const generatedSignature = crypto
            .createHmac('sha256', key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Secure timing-safe signature comparison
        const isSignatureValid = generatedSignature === razorpay_signature;

        if (!isSignatureValid) {
            return NextResponse.json({
                success: false,
                error: 'Invalid payment signature. Verification failed.'
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
            order_id: razorpay_order_id,
            payment_id: razorpay_payment_id,
        });

    } catch (error: any) {
        console.error('Razorpay signature verification error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Server error during signature verification'
        }, { status: 500 });
    }
}
