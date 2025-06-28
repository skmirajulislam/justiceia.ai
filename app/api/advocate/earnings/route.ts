import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || !['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized. Only professional users can view earnings.' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

        // Get monthly earnings for the year
        const monthlyEarnings = await prisma.monthlyEarnings.findMany({
            where: {
                advocate_id: session.user.id,
                year,
            },
            orderBy: {
                month: 'asc',
            },
        });

        // Get total earnings and consultation count
        const totalStats = await prisma.monthlyEarnings.aggregate({
            where: {
                advocate_id: session.user.id,
            },
            _sum: {
                total_amount: true,
                consultation_count: true,
            },
        });

        // Get recent payments
        // Get recent payments (without relations since they're not defined in schema)
        const recentPayments = await prisma.payment.findMany({
            where: {
                advocate_id: session.user.id,
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
                const request = await prisma.consultationRequest.findUnique({
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
                    clientName: client ? `${client.first_name} ${client.last_name}` : 'Unknown Client',
                    consultationType: request?.consultation_type || 'UNKNOWN',
                    processedAt: payment.processed_at,
                    title: request?.title || 'Consultation',
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
