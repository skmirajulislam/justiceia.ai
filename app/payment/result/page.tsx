'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const PaymentResultContent = () => {
    const searchParams = useSearchParams();
    const success = searchParams?.get('success') === 'true';
    const transactionId = searchParams?.get('transaction_id');
    const amount = searchParams?.get('amount');

    return (
        <Card className="max-w-md w-full">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    {success ? (
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                    ) : (
                        <div className="bg-red-100 p-3 rounded-full">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                    )}
                </div>
                <CardTitle className={success ? 'text-green-700' : 'text-red-700'}>
                    {success ? 'Payment Successful!' : 'Payment Failed'}
                </CardTitle>
                <CardDescription>
                    {success
                        ? 'Your payment has been processed successfully (simulated)'
                        : 'There was an issue processing your payment (simulated)'
                    }
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                        {transactionId && (
                            <p className="text-sm">
                                <strong>Transaction ID:</strong> {transactionId}
                            </p>
                        )}
                        {amount && (
                            <p className="text-sm">
                                <strong>Amount:</strong> ₹{amount}
                            </p>
                        )}
                        <p className="text-sm">
                            <strong>Status:</strong> Completed (Demo)
                        </p>
                    </div>
                )}

                {!success && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-700">
                            This is a simulated payment failure for demonstration purposes.
                            In a real application, you would see the actual error message here.
                        </p>
                    </div>
                )}

                <div className="pt-4">
                    <Link href="/consultation" className="w-full">
                        <Button className="w-full">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Consultations
                        </Button>
                    </Link>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        This is a demo payment system for hackathon/demonstration purposes only.
                        No real money was processed.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

const PaymentResultPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 flex items-center justify-center p-4">
            <Suspense fallback={
                <Card className="max-w-md w-full">
                    <CardContent className="p-6">
                        <div className="text-center">Loading payment result...</div>
                    </CardContent>
                </Card>
            }>
                <PaymentResultContent />
            </Suspense>
        </div>
    );
};

export default PaymentResultPage;
