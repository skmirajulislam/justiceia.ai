import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user with advocate profile if applicable
        const profile = await prisma.profile.findUnique({
            where: { email },
            include: {
                advocateProfile: true
            }
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        if (!profile.password) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const isValidPassword = await bcrypt.compare(password, profile.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Create JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const token = jwt.sign(
            {
                userId: profile.id,
                email: profile.email,
                role: profile.role
            },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Create session object
        const isProfessional = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(profile.role);

        const session = {
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name} ${profile.last_name}`.trim(),
                role: profile.role,
                kyc_type: profile.kyc_type,
                can_upload_reports: profile.can_upload_reports,
                is_professional: isProfessional,
                vkyc_completed: profile.vkyc_completed,
                advocateProfile: profile.advocateProfile ? {
                    id: profile.advocateProfile.id,
                    specialization: profile.advocateProfile.specialization,
                    hourly_rate: profile.advocateProfile.hourly_rate,
                    is_verified: profile.advocateProfile.is_verified,
                    is_available: profile.advocateProfile.is_available
                } : null
            }
        };

        // Set HTTP-only cookie
        const response = NextResponse.json({
            success: true,
            session,
            message: 'Login successful'
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });

        return response;

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}