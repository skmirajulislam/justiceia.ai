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

        // Get all advocate profiles with user information
        const advocates = await prisma.advocateProfile.findMany({
            where: {
                is_available: true,
            },
            include: {
                profile: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        // Transform data to match the frontend Lawyer interface
        const transformedAdvocates = advocates.map(advocate => ({
            id: advocate.user_id,
            name: `${advocate.profile.first_name || ''} ${advocate.profile.last_name || ''}`.trim() || 'Advocate',
            specialization: advocate.specialization[0] || 'General Practice', // Take first specialization
            experience: advocate.experience,
            rating: advocate.rating || 0,
            location: advocate.location || 'Not specified',
            rate: advocate.hourly_rate,
            available: advocate.is_available,
            image: advocate.image_url || '/default-avatar.svg',
            languages: advocate.languages || ['English'],
            bio: advocate.bio || '',
            education: advocate.education || '',
            certifications: advocate.certifications || [],
        }));

        return NextResponse.json({
            advocates: transformedAdvocates,
            count: transformedAdvocates.length
        });

    } catch (error) {
        console.error('Error fetching advocates:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
