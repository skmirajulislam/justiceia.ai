import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: string }

        // Fetch user's VKYC status
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
                address: true,
                role: true,
                vkyc_completed: true,
                vkyc_completed_at: true,
                updated_at: true,
                vkycDocuments: {
                    select: {
                        id: true,
                        document_type: true,
                        kyc_type: true,
                        created_at: true
                    }
                }
            }
        })

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Check if profile has incomplete required fields
        const requiredFields = ['first_name', 'last_name', 'phone']
        const missingFields = requiredFields.filter(field =>
            !profile[field as keyof typeof profile] ||
            (profile[field as keyof typeof profile] as string)?.trim() === ''
        )

        const vkycStatus = {
            user_id: profile.id,
            email: profile.email,
            vkyc_completed: profile.vkyc_completed,
            vkyc_completed_at: profile.vkyc_completed_at,
            profile_updated_at: profile.updated_at,
            has_required_fields: missingFields.length === 0,
            missing_fields: missingFields,
            documents_count: profile.vkycDocuments.length,
            documents: profile.vkycDocuments,
            requires_vkyc: !profile.vkyc_completed || missingFields.length > 0,
            can_complete_vkyc: missingFields.length === 0,
            profile_complete: missingFields.length === 0,
            message: !profile.vkyc_completed
                ? (missingFields.length > 0
                    ? `Please complete your profile (${missingFields.join(', ')}) before VKYC verification.`
                    : 'VKYC verification is required to access all features.')
                : 'VKYC verification completed.'
        }

        return NextResponse.json({
            success: true,
            vkyc_status: vkycStatus
        })
    } catch (error) {
        console.error('VKYC status check error:', error)
        return NextResponse.json({
            error: 'Failed to check VKYC status',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
