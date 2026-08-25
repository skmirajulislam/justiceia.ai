import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        let decoded: { userId: string; email: string; role: string };
        try {
            decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
        } catch {
            return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }

        const user = await prisma.profile.findUnique({
            where: { id: decoded.userId },
        });

        if (!user || !['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized. Only professional users can view earnings.' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        // Get monthly earnings for the year
        const monthlyEarnings = await prisma.monthlyEarnings.findMany({
            where: {
                advocate_id: user.id,
                year,
            },
            orderBy: {
                month: 'asc',
            },
        });

        // Get total earnings and consultation count
        const totalStats = await prisma.monthlyEarnings.aggregate({
            where: {
                advocate_id: user.id,
            },
            _sum: {
                total_amount: true,
                consultation_count: true,
            },
        });

        // Get recent payments
        const recentPayments = await prisma.payment.findMany({
            where: {
                advocate_id: user.id,
                status: 'COMPLETED',
            },
            orderBy: {
                processed_at: 'desc',
            },
            take: 10,
        });

        // Get client and request data separately
        const formattedPayments = await Promise.all(
            recentPayments.map(async (payment) => {
                const requestItem = await prisma.consultationRequest.findUnique({
                    where: { id: payment.request_id }
                });

                const client = await prisma.profile.findUnique({
                    where: { id: payment.client_id },
                    select: {
                        first_name: true,
                        last_name: true,
                    },
                });

                return {
                    id: payment.id,
                    amount: payment.amount,
                    clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown Client',
                    consultationType: requestItem?.consultation_type || 'UNKNOWN',
                    processedAt: payment.processed_at,
                    title: requestItem?.title || 'Consultation',
                };
            })
        );

        // Create monthly chart data (12 months)
        const chartData = Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const monthData = monthlyEarnings.find(me => me.month === month);
            return {
                month: new Date(year, i).toLocaleString('default', { month: 'short' }),
                earnings: monthData?.total_amount || 0,
                consultations: monthData?.consultation_count || 0,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                monthlyEarnings: chartData,
                totalEarnings: totalStats._sum.total_amount || 0,
                totalConsultations: totalStats._sum.consultation_count || 0,
                recentPayments: formattedPayments,
                year,
            },
        });

    } catch (error) {
        console.error('Error fetching earnings dashboard:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
