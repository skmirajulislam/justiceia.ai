import { NextRequest, NextResponse } from 'next/server';

interface AccessRecord {
    id: string;
    consultationId: string;
    clientId: string;
    advocateId: string;
    accessType: 'video' | 'chat' | 'both';
    grantedAt: string;
    expiresAt: string;
    paymentId: string;
    isActive: boolean;
}

// In-memory storage for demo purposes
const accessRecords: AccessRecord[] = [];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { consultationId, clientId, advocateId, accessType, paymentId } = body;

        // Validate required fields
        if (!consultationId || !clientId || !advocateId || !accessType || !paymentId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if access already exists for this consultation
        const existingAccess = accessRecords.find(
            record => record.consultationId === consultationId && record.isActive
        );

        if (existingAccess) {
            return NextResponse.json({
                success: true,
                access: existingAccess,
                message: 'Access already granted'
            });
        }

        // Grant 24-hour access after payment
        const now = new Date();
        const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const accessRecord: AccessRecord = {
            id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            consultationId,
            clientId,
            advocateId,
            accessType,
            grantedAt: now.toISOString(),
            expiresAt: expirationDate.toISOString(),
            paymentId,
            isActive: true
        };

        accessRecords.push(accessRecord);

        return NextResponse.json({
            success: true,
            access: accessRecord,
            message: 'Access granted for 24 hours'
        });

    } catch (error) {
        console.error('Error granting access:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const consultationId = url.searchParams.get('consultationId');
        const clientId = url.searchParams.get('clientId');

        if (!consultationId || !clientId) {
            return NextResponse.json(
                { error: 'Missing consultationId or clientId' },
                { status: 400 }
            );
        }

        // Find active access for this consultation and client
        const access = accessRecords.find(
            record =>
                record.consultationId === consultationId &&
                record.clientId === clientId &&
                record.isActive &&
                new Date(record.expiresAt) > new Date()
        );

        if (!access) {
            return NextResponse.json({
                success: false,
                hasAccess: false,
                message: 'No active access found'
            });
        }

        return NextResponse.json({
            success: true,
            hasAccess: true,
            access,
            timeRemaining: new Date(access.expiresAt).getTime() - Date.now()
        });

    } catch (error) {
        console.error('Error checking access:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
