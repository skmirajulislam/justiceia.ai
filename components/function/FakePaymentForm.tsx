'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Lock, Shield } from 'lucide-react';

interface FakePaymentFormProps {
    sessionId: string;
    amount: number;
    currency?: string;
    advocateName: string;
    description: string;
    onSuccess: (transactionId: string) => void;
    onCancel: () => void;
}

const FakePaymentForm: React.FC<FakePaymentFormProps> = ({
    sessionId,
    amount,
    currency = 'INR',
    advocateName,
    description,
    onSuccess,
    onCancel
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        cardNumber: '',
        expiry: '',
        cvv: '',
        cardholderName: ''
    });

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiry = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const handleInputChange = (field: string, value: string) => {
        let formattedValue = value;

        if (field === 'cardNumber') {
            formattedValue = formatCardNumber(value);
        } else if (field === 'expiry') {
            formattedValue = formatExpiry(value);
        } else if (field === 'cvv') {
            formattedValue = value.replace(/[^0-9]/g, '').slice(0, 4);
        }

        setFormData(prev => ({
            ...prev,
            [field]: formattedValue
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Basic validation
            if (!formData.cardNumber || !formData.expiry || !formData.cvv || !formData.cardholderName) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all payment details",
                    variant: "destructive",
                });
                return;
            }

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Call our fake payment processing API
            const response = await fetch('/api/payment/process-fake', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    card_number: formData.cardNumber.replace(/\s/g, ''),
                    expiry: formData.expiry,
                    cvv: formData.cvv,
                    cardholder_name: formData.cardholderName,
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "Payment Successful! 🎉",
                    description: "Your payment has been processed successfully (simulated)",
                });
                onSuccess(result.transaction_id);
            } else {
                toast({
                    title: "Payment Failed",
                    description: result.error || "Payment processing failed",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Payment error:', error);
            toast({
                title: "Payment Error",
                description: "An error occurred while processing payment",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6">
            <Card>
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                            <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle>Secure Payment</CardTitle>
                    <CardDescription>
                        <div className="space-y-2">
                            <p><strong>Consultation with:</strong> {advocateName}</p>
                            <p><strong>Amount:</strong> {currency} {amount}</p>
                            <p className="text-sm text-gray-600">{description}</p>
                        </div>
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                        <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800">
                                <strong>Demo Mode:</strong> This is a simulated payment for demonstration purposes only.
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="cardNumber">Card Number</Label>
                            <Input
                                id="cardNumber"
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                value={formData.cardNumber}
                                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                                maxLength={19}
                                className="text-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Use any 13-19 digit number for demo
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="expiry">Expiry Date</Label>
                                <Input
                                    id="expiry"
                                    type="text"
                                    placeholder="MM/YY"
                                    value={formData.expiry}
                                    onChange={(e) => handleInputChange('expiry', e.target.value)}
                                    maxLength={5}
                                />
                            </div>
                            <div>
                                <Label htmlFor="cvv">CVV</Label>
                                <Input
                                    id="cvv"
                                    type="text"
                                    placeholder="123"
                                    value={formData.cvv}
                                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                                    maxLength={4}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="cardholderName">Cardholder Name</Label>
                            <Input
                                id="cardholderName"
                                type="text"
                                placeholder="John Doe"
                                value={formData.cardholderName}
                                onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                            />
                        </div>

                        <div className="flex space-x-3 pt-4">
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
                                type="submit"
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Processing...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Lock className="h-4 w-4" />
                                        <span>Pay {currency} {amount}</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-500">
                            🔒 Your payment information is secured with 256-bit SSL encryption (simulated)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default FakePaymentForm;
