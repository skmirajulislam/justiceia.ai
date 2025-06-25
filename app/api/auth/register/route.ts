import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/integrations/client';

export async function POST(req: NextRequest) {
    try {
        const { email, password, firstName, lastName, phone, role } = await req.json();

        // Check if user already exists
        const existingUser = await prisma.profile.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await prisma.profile.create({
            data: {
                email,
                password: hashedPassword,
                first_name: firstName,
                last_name: lastName,
                phone,
                role,
                vkyc_completed: false
            }
        });

        // Create JWT token
        const jwtSecret = process.env.JWT_SECRET;
        console.log('🔑 Creating JWT with secret available:', !!jwtSecret);

        if (!jwtSecret) {
            console.error('❌ JWT_SECRET not available during token creation');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );

        console.log('✅ JWT token created successfully');

        // Create session object
        const session = {
            user: {
                id: user.id,
                email: user.email,
                name: `${firstName} ${lastName}`,
                vkyc_completed: false
            }
        };

        // Set HTTP-only cookie
        const response = NextResponse.json({ session });
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
        });

        console.log('Cookie set with token');

        return response;

    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}