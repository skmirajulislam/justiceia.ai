import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

// Helper function to authenticate user and check role
async function authenticateUser(request: NextRequest) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
        return { error: 'No authentication token found. Please log in.', status: 401 };
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return { error: 'Server configuration error', status: 500 };
    }

    let decoded;
    try {
        decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };
    } catch {
        return { error: 'Invalid authentication token', status: 401 };
    }

    const user = await prisma.profile.findUnique({
        where: { id: decoded.userId }
    });

    if (!user) {
        return { error: 'User not found', status: 401 };
    }

    return { user, decoded };
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await authenticateUser(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const allowedRoles = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({
                error: `Unauthorized. Your role '${user.role}' is not allowed. Only professional users (BARRISTER, LAWYER, GOVERNMENT_OFFICIAL) can manage advocate profiles.`
            }, { status: 401 });
        }

        const body = await request.json();
        const {
            specialization,
            experience,
            bio,
            education,
            certifications,
            hourly_rate,
            location,
            languages,
            image_url
        } = body;

        // Validate required fields
        if (!specialization || experience === undefined || hourly_rate === undefined || !bio || !education || !certifications || !languages) {
            return NextResponse.json(
                { error: 'Missing required fields: specialization, experience, hourly_rate, bio, education, certifications, languages' },
                { status: 400 }
            );
        }

        // Parse and validate numeric fields
        const parsedExperience = typeof experience === 'number' ? experience : parseInt(experience);
        const parsedHourlyRate = typeof hourly_rate === 'number' ? hourly_rate : parseFloat(hourly_rate);

        if (isNaN(parsedExperience) || parsedExperience < 0) {
            return NextResponse.json(
                { error: 'Experience must be a non-negative number' },
                { status: 400 }
            );
        }

        if (isNaN(parsedHourlyRate) || parsedHourlyRate < 100) {
            return NextResponse.json(
                { error: 'Hourly rate must be at least ₹100' },
                { status: 400 }
            );
        }

        if (bio.length < 10) {
            return NextResponse.json(
                { error: 'Bio must be at least 10 characters long' },
                { status: 400 }
            );
        }

        // Create or update advocate profile
        const advocateProfile = await prisma.advocateProfile.upsert({
            where: {
                user_id: user.id,
            },
            update: {
                specialization: Array.isArray(specialization) ? specialization : [specialization],
                experience: parsedExperience,
                bio,
                education,
                certifications: Array.isArray(certifications) ? certifications : [],
                hourly_rate: parsedHourlyRate,
                location,
                languages: Array.isArray(languages) ? languages : [],
                image_url,
            },
            create: {
                user_id: user.id,
                specialization: Array.isArray(specialization) ? specialization : [specialization],
                experience: parsedExperience,
                bio: bio || '',
                education: education || '',
                certifications: Array.isArray(certifications) ? certifications : [],
                hourly_rate: parsedHourlyRate,
                location: location || '',
                languages: Array.isArray(languages) ? languages : [],
                image_url: image_url || '',
            },
            include: {
                profile: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            profile: advocateProfile,
        });

    } catch (error) {
        console.error('Error creating/updating advocate profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const authResult = await authenticateUser(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const searchParams = request.nextUrl.searchParams;
        const advocateId = searchParams.get('advocate_id');

        if (advocateId) {
            // Get specific advocate profile
            const advocateProfile = await prisma.advocateProfile.findUnique({
                where: {
                    user_id: advocateId,
                },
                include: {
                    profile: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });

            if (!advocateProfile) {
                return NextResponse.json(
                    { error: 'Advocate profile not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ profile: advocateProfile });
        } else if (['LAWYER', 'BARRISTER', 'GOVERNMENT_OFFICIAL'].includes(user.role)) {
            // Get current advocate's profile
            const advocateProfile = await prisma.advocateProfile.findUnique({
                where: {
                    user_id: user.id,
                },
                include: {
                    profile: {
                        select: {
                            first_name: true,
                            last_name: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });

            return NextResponse.json({ profile: advocateProfile });
        } else {
            // Get all advocate profiles (for clients)
            const advocateProfiles = await prisma.advocateProfile.findMany({
                where: {
                    is_available: true,
                },
                include: {
                    profile: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                        },
                    },
                },
                orderBy: {
                    rating: 'desc',
                },
            });

            return NextResponse.json({ profiles: advocateProfiles });
        }

    } catch (error) {
        console.error('Error fetching advocate profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authResult = await authenticateUser(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const allowedRoles = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({
                error: `Unauthorized. Your role '${user.role}' is not allowed. Only professional users can manage advocate profiles.`
            }, { status: 401 });
        }

        const body = await request.json();
        const {
            specialization,
            experience,
            bio,
            education,
            certifications,
            hourly_rate,
            location,
            languages,
            image_url,
            is_available
        } = body;

        // Update advocate profile
        const advocateProfile = await prisma.advocateProfile.update({
            where: {
                user_id: user.id,
            },
            data: {
                ...(specialization && {
                    specialization: Array.isArray(specialization) ? specialization : [specialization]
                }),
                ...(experience && { experience: parseInt(experience) }),
                ...(bio !== undefined && { bio }),
                ...(education !== undefined && { education }),
                ...(certifications && {
                    certifications: Array.isArray(certifications) ? certifications : []
                }),
                ...(hourly_rate && { hourly_rate: parseFloat(hourly_rate) }),
                ...(location !== undefined && { location }),
                ...(languages && {
                    languages: Array.isArray(languages) ? languages : []
                }),
                ...(image_url !== undefined && { image_url }),
                ...(is_available !== undefined && { is_available }),
            },
            include: {
                profile: {
                    select: {
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            profile: advocateProfile,
        });

    } catch (error) {
        console.error('Error updating advocate profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const authResult = await authenticateUser(request);
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        const { user } = authResult;
        const allowedRoles = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({
                error: `Unauthorized. Your role '${user.role}' is not allowed. Only professional users can manage advocate profiles.`
            }, { status: 401 });
        }

        // Delete advocate profile
        await prisma.advocateProfile.delete({
            where: {
                user_id: user.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Advocate profile deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting advocate profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
