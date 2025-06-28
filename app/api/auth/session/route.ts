import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ session: null });
        }

        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ session: null });
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string; role: string };

        // Fetch fresh user data from database
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: {
                advocateProfile: true
            }
        });

        if (!profile) {
            return NextResponse.json({ session: null });
        }

        const session = {
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name} ${profile.last_name}`.trim(),
                role: profile.role,
                kyc_type: profile.kyc_type,
                can_upload_reports: profile.can_upload_reports,
                vkyc_completed: profile.vkyc_completed,
                isProfessional: ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(profile.role),
                advocateProfile: profile.advocateProfile ? {
                    id: profile.advocateProfile.id,
                    specialization: profile.advocateProfile.specialization,
                    hourly_rate: profile.advocateProfile.hourly_rate,
                    is_verified: profile.advocateProfile.is_verified,
                    is_available: profile.advocateProfile.is_available
                } : null
            }
        };

        return NextResponse.json({ session });

    } catch (error) {
        console.error('Session verification error:', error);
        return NextResponse.json({ session: null });
    }
}