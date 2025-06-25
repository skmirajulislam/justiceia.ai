import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/integrations/client';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        // Find user
        const profile = await prisma.profile.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                first_name: true,
                last_name: true,
                vkyc_completed: true
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
        const token = jwt.sign(
            {
                userId: profile.id,
                email: profile.email
            },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        // Create session object
        const session = {
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name} ${profile.last_name}`,
                vkyc_completed: profile.vkyc_completed
            }
        };

        // Set cookie and return session
        const response = NextResponse.json({
            success: true,
            session,
            message: 'Login successful'
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 // 7 days
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