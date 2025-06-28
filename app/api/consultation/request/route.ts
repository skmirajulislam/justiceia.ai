import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { advocate_id, title, description, consultation_type, amount } = body;

        // Validate input
        if (!advocate_id || !title || !description || !consultation_type || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if advocate exists and is a professional user
        const advocate = await prisma.profile.findFirst({
            where: {
                id: advocate_id,
                role: {
                    in: ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL']
                },
            },
            include: {
                advocateProfile: true,
            },
        });

        if (!advocate || !advocate.advocateProfile) {
            return NextResponse.json({ error: 'Advocate not found' }, { status: 404 });
        }

        // Create consultation request
        const consultationRequest = await prisma.consultationRequest.create({
            data: {
                client_id: session.user.id,
                advocate_id,
                title,
                description,
                consultation_type: consultation_type.toUpperCase(),
                amount: parseFloat(amount),
                status: 'PENDING',
            },
        });

        // Fetch client and advocate details separately
        const [client, advocateProfile] = await Promise.all([
            prisma.profile.findUnique({
                where: { id: session.user.id },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                },
            }),
            prisma.profile.findUnique({
                where: { id: advocate_id },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            request: {
                ...consultationRequest,
                client,
                advocate: advocateProfile,
            },
        });

    } catch (error) {
        console.error('Error creating consultation request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const userType = searchParams.get('userType') || 'client';

        let requests;

        if (userType === 'advocate' && ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(session.user.role)) {
            // Get requests for this advocate
            requests = await prisma.consultationRequest.findMany({
                where: {
                    advocate_id: session.user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            // Get related data separately
            requests = await Promise.all(requests.map(async (request) => {
                const [client, payment, accessGrant] = await Promise.all([
                    prisma.profile.findUnique({
                        where: { id: request.client_id },
                        select: { id: true, first_name: true, last_name: true, email: true },
                    }),
                    prisma.payment.findUnique({ where: { request_id: request.id } }),
                    prisma.accessGrant.findUnique({ where: { request_id: request.id } }),
                ]);
                return { ...request, client, payment, accessGrant };
            }));
        } else {
            // Get requests for this client
            requests = await prisma.consultationRequest.findMany({
                where: {
                    client_id: session.user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            // Get related data separately
            requests = await Promise.all(requests.map(async (request) => {
                const [advocate, payment, accessGrant] = await Promise.all([
                    prisma.profile.findUnique({
                        where: { id: request.advocate_id },
                        select: { id: true, first_name: true, last_name: true, email: true },
                    }),
                    prisma.payment.findUnique({ where: { request_id: request.id } }),
                    prisma.accessGrant.findUnique({ where: { request_id: request.id } }),
                ]);
                return { ...request, advocate, payment, accessGrant };
            }));
        }

        return NextResponse.json({ requests });

    } catch (error) {
        console.error('Error fetching consultation requests:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
