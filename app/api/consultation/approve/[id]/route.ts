import { NextRequest, NextResponse } from 'next/server';

interface ConsultationRequest {
    id: string;
    clientId: string;
    clientName: string;
    advocateId: string;
    advocateName: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requestDate: string;
    message: string;
    consultationType: 'video' | 'chat';
    amount: number;
    paymentStatus: 'pending' | 'paid' | 'failed';
    updatedAt?: string;
}

// In-memory storage for demo purposes
const consultationRequests: Record<string, ConsultationRequest> = {};

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const requestId = params.id;

        // Update request status to approved
        if (consultationRequests[requestId]) {
            consultationRequests[requestId].status = 'approved';
            consultationRequests[requestId].updatedAt = new Date().toISOString();
        }

        // Here you would typically:
        // 1. Update database
        // 2. Send notification to client
        // 3. Process payment if not already done
        // 4. Send real-time notification via socket

        return NextResponse.json({
            success: true,
            message: 'Consultation request approved',
            request: consultationRequests[requestId]
        });

    } catch (error) {
        console.error('Approve request error:', error);
        return NextResponse.json(
            { error: 'Failed to approve consultation request' },
            { status: 500 }
        );
    }
}
