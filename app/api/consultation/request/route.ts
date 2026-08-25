import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { ConsultationType } from '@/app/generated/prisma';

async function getAuthUser(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) return null;

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return null;

        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
        if (!decoded?.userId) return null;

        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                vkyc_completed: true,
            },
        });

        return profile;
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { advocate_id, title, description, consultation_type, amount } = body;

        // Validate input
        if (!advocate_id || !title || !description || !consultation_type || !amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check if advocate exists and has an advocate profile
        const advocate = await prisma.profile.findFirst({
            where: {
                id: advocate_id,
                role: {
                    in: ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'],
                },
            },
            include: {
                advocateProfile: true,
            },
        });

        if (!advocate || !advocate.advocateProfile) {
            return NextResponse.json({ error: 'Advocate not found' }, { status: 404 });
        }

        const cleanType = String(consultation_type).toUpperCase();
        const finalType = (Object.values(ConsultationType).includes(cleanType as ConsultationType))
            ? (cleanType as ConsultationType)
            : ConsultationType.BOTH;

        // Create consultation request
        const consultationRequest = await prisma.consultationRequest.create({
            data: {
                client_id: user.id,
                advocate_id,
                title,
                description,
                consultation_type: finalType,
                amount: parseFloat(amount),
                status: 'PENDING',
            },
        });

        return NextResponse.json({
            success: true,
            request: {
                ...consultationRequest,
                client: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                },
                advocate: {
                    id: advocate.id,
                    first_name: advocate.first_name,
                    last_name: advocate.last_name,
                    email: advocate.email,
                },
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
        const user = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const userType = searchParams.get('userType') || 'client';

        let requests;

        const isAdvocateRole = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(user.role);

        if (userType === 'advocate' && isAdvocateRole) {
            requests = await prisma.consultationRequest.findMany({
                where: {
                    advocate_id: user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            requests = await Promise.all(
                requests.map(async (reqItem) => {
                    const [client, payment, accessGrant] = await Promise.all([
                        prisma.profile.findUnique({
                            where: { id: reqItem.client_id },
                            select: { id: true, first_name: true, last_name: true, email: true, phone: true },
                        }),
                        prisma.payment.findUnique({ where: { request_id: reqItem.id } }),
                        prisma.accessGrant.findUnique({ where: { request_id: reqItem.id } }),
                    ]);
                    return { ...reqItem, client, payment, accessGrant };
                })
            );
        } else {
            requests = await prisma.consultationRequest.findMany({
                where: {
                    client_id: user.id,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            requests = await Promise.all(
                requests.map(async (reqItem) => {
                    const [advocate, payment, accessGrant] = await Promise.all([
                        prisma.profile.findUnique({
                            where: { id: reqItem.advocate_id },
                            select: { id: true, first_name: true, last_name: true, email: true, phone: true },
                        }),
                        prisma.payment.findUnique({ where: { request_id: reqItem.id } }),
                        prisma.accessGrant.findUnique({ where: { request_id: reqItem.id } }),
                    ]);
                    return { ...reqItem, advocate, payment, accessGrant };
                })
            );
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
