import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demo purposes
const consultationRequests: Record<string, any> = {};

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const requestId = params.id;

        // Update request status to rejected
        if (consultationRequests[requestId]) {
            consultationRequests[requestId].status = 'rejected';
            consultationRequests[requestId].updatedAt = new Date().toISOString();
        }

        // Here you would typically:
        // 1. Update database
        // 2. Send notification to client
        // 3. Refund payment if already processed
        // 4. Send real-time notification via socket

        return NextResponse.json({
            success: true,
            message: 'Consultation request rejected',
            request: consultationRequests[requestId]
        });

    } catch (error) {
        console.error('Reject request error:', error);
        return NextResponse.json(
            { error: 'Failed to reject consultation request' },
            { status: 500 }
        );
    }
}
