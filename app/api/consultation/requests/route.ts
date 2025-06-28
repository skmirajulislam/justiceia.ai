import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        // Get JWT token from cookies
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
        } catch {
            return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }

        // Verify user exists
        const user = await prisma.profile.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 401 });
        }

        let consultationRequests;

        // Check if user is an advocate
        const isAdvocate = ['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(user.role);

        if (isAdvocate) {
            // For advocates: get requests sent to them
            consultationRequests = await prisma.consultationRequest.findMany({
                where: {
                    advocate_id: user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
        } else {
            // For clients: get requests they made
            consultationRequests = await prisma.consultationRequest.findMany({
                where: {
                    client_id: user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
        }

        // Get client and advocate names separately
        const clientIds = [...new Set(consultationRequests.map(r => r.client_id))];
        const advocateIds = [...new Set(consultationRequests.map(r => r.advocate_id))];

        const [clients, advocates] = await Promise.all([
            prisma.profile.findMany({
                where: { id: { in: clientIds } },
                select: { id: true, first_name: true, last_name: true }
            }),
            prisma.profile.findMany({
                where: { id: { in: advocateIds } },
                select: { id: true, first_name: true, last_name: true }
            })
        ]);

        // Create lookup maps
        const clientMap = new Map(clients.map(c => [c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Client']));
        const advocateMap = new Map(advocates.map(a => [a.id, `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Advocate']));

        // Get payment status from payments table
        const payments = await prisma.payment.findMany({
            where: {
                request_id: { in: consultationRequests.map(r => r.id) }
            },
            select: {
                request_id: true,
                status: true
            }
        });

        const paymentMap = new Map(payments.map(p => [p.request_id, p.status.toLowerCase()]));

        // Transform data to match frontend interface
        const transformedRequests = consultationRequests.map(request => ({
            id: request.id,
            clientId: request.client_id,
            clientName: clientMap.get(request.client_id) || 'Client',
            advocateId: request.advocate_id,
            advocateName: advocateMap.get(request.advocate_id) || 'Advocate',
            status: request.status.toLowerCase(),
            requestDate: request.created_at.toISOString(),
            message: request.description || '',
            consultationType: request.consultation_type.toLowerCase(),
            amount: request.amount || 0,
            paymentStatus: paymentMap.get(request.id) || 'pending',
        }));

        return NextResponse.json({
            requests: transformedRequests,
            count: transformedRequests.length
        });

    } catch (error) {
        console.error('Error fetching consultation requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
