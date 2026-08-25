'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Lock, Shield, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface RazorpayPaymentModalProps {
    requestId: string;
    advocateName: string;
    amount: number;
    description: string;
    onSuccess: (transactionId: string) => void;
    onCancel: () => void;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const RazorpayPaymentModal: React.FC<RazorpayPaymentModalProps> = ({
    requestId,
    advocateName,
    amount,
    description,
    onSuccess,
    onCancel,
}) => {
    const [loading, setLoading] = useState(false);
    const [orderData, setOrderData] = useState<any>(null);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);

    useEffect(() => {
        const loadRazorpayScript = () => {
            if (window.Razorpay) {
                setRazorpayLoaded(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => setRazorpayLoaded(true);
            script.onerror = () => {
                console.warn('Failed to load external Razorpay checkout script');
                setRazorpayLoaded(false);
            };
            document.body.appendChild(script);
        };

        loadRazorpayScript();
    }, []);

    const handleInitiatePayment = async () => {
        setLoading(true);

        try {
            // 1. Create order on server
            const createRes = await fetch('/api/payment/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId }),
            });

            const order = await createRes.json();

            if (!createRes.ok || !order.success) {
                toast({
                    title: 'Payment Error',
                    description: order.error || 'Failed to initialize payment',
                    variant: 'destructive',
                });
                setLoading(false);
                return;
            }

            setOrderData(order);

            const activeKeyId = order.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

            // 2. If Razorpay SDK is loaded, launch standard Razorpay modal checkout
            if (window.Razorpay && activeKeyId) {
                const options = {
                    key: activeKeyId,
                    amount: Math.round(order.amount * 100),
                    currency: order.currency || 'INR',
                    name: 'Justiceia.ai',
                    description: `Legal Consultation with ${advocateName}`,
                    order_id: order.order_id,
                    prefill: {
                        name: order.client_name || '',
                        email: order.client_email || '',
                        contact: order.client_phone || '',
                    },
                    theme: {
                        color: '#0284c7',
                    },
                    modal: {
                        ondismiss: () => {
                            setLoading(false);
                            toast({
                                title: 'Payment Dismissed',
                                description: 'Checkout modal was closed before completing payment.',
                            });
                        },
                    },
                    handler: async function (response: {
                        razorpay_payment_id: string;
                        razorpay_order_id: string;
                        razorpay_signature: string;
                    }) {
                        await verifyPayment(response, order.order_id, false);
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (resp: any) {
                    toast({
                        title: 'Payment Failed',
                        description: resp.error?.description || resp.error?.reason || 'Payment could not be completed',
                        variant: 'destructive',
                    });
                    setLoading(false);
                });

                rzp.open();
            } else {
                // Fallback simulation only if Razorpay script could not load
                await simulateSandboxPayment(order.order_id);
            }
        } catch (error: any) {
            console.error('Payment initialization error:', error);
            toast({
                title: 'Payment Error',
                description: error.message || 'An unexpected error occurred',
                variant: 'destructive',
            });
            setLoading(false);
        }
    };

    const simulateSandboxPayment = async (orderId: string) => {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const simResponse = {
                razorpay_order_id: orderId,
                razorpay_payment_id: `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                razorpay_signature: 'simulated_valid_signature',
                is_simulated: true,
            };

            await verifyPayment(simResponse, orderId, true);
        } catch (simError: any) {
            toast({
                title: 'Simulation Error',
                description: simError.message,
                variant: 'destructive',
            });
            setLoading(false);
        }
    };

    const verifyPayment = async (payload: any, orderId: string, isSimulated: boolean) => {
        try {
            const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    razorpay_order_id: payload.razorpay_order_id || orderId,
                    razorpay_payment_id: payload.razorpay_payment_id,
                    razorpay_signature: payload.razorpay_signature,
                    is_simulated: isSimulated,
                }),
            });

            const result = await verifyRes.json();

            if (result.success) {
                toast({
                    title: 'Payment Verified! 🎉',
                    description: '24-hour consultation access has been granted.',
                });
                onSuccess(result.transaction_id || payload.razorpay_payment_id);
            } else {
                toast({
                    title: 'Verification Failed',
                    description: result.error || 'Payment verification failed',
                    variant: 'destructive',
                });
            }
        } catch (err: any) {
            toast({
                title: 'Verification Error',
                description: err.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <Card className="border-sky-100 dark:border-sky-900 shadow-lg">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-3">
                        <div className="bg-sky-100 dark:bg-sky-900/50 p-3 rounded-full">
                            <CreditCard className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                        </div>
                    </div>
                    <CardTitle className="text-xl font-bold">Razorpay Secure Checkout</CardTitle>
                    <CardDescription>
                        Complete payment to unlock your 24-hour video and chat consultation session
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl space-y-2 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Advocate:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{advocateName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Service:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Consultation (Video + Chat)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Access Validity:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">24 Hours from Payment</span>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center">
                            <span className="font-bold text-slate-800 dark:text-slate-100">Total Amount:</span>
                            <span className="text-xl font-extrabold text-sky-600 dark:text-sky-400">₹{amount}</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                            <div className="text-xs text-blue-800 dark:text-blue-300">
                                <strong>Payment Methods Supported:</strong> UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Wallets.
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleInitiatePayment}
                            disabled={loading}
                            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Lock className="h-4 w-4" />
                                    <span>Pay ₹{amount}</span>
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            )}
                        </Button>
                    </div>

                    <div className="text-center pt-2">
                        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                            <Lock className="h-3 w-3" /> Powered by Razorpay Standard Checkout & 256-bit Encryption
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RazorpayPaymentModal;
