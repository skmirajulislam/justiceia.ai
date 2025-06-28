import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
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
        const { profileData, documents, kycType } = await req.json()

        // Validate that user exists and get their role
        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Determine the correct KYC type based on user role
        let finalKycType: 'REGULAR' | 'PROFESSIONAL';

        if (existingProfile.role === 'REGULAR_USER') {
            finalKycType = 'REGULAR';
        } else if (existingProfile.role === 'BARRISTER' ||
            existingProfile.role === 'LAWYER' ||
            existingProfile.role === 'GOVERNMENT_OFFICIAL') {
            finalKycType = 'PROFESSIONAL';
        } else {
            // Default fallback
            finalKycType = 'REGULAR';
        }

        // Update profile with VKYC completion
        await prisma.profile.update({
            where: { id: decoded.userId },
            data: {
                ...profileData,
                vkyc_completed: true,
                vkyc_completed_at: new Date(),
                updated_at: new Date()
            }
        })

        // Save document records if provided
        if (documents && Array.isArray(documents) && documents.length > 0) {
            // First, delete any existing VKYC documents for this user
            await prisma.vkycDocument.deleteMany({
                where: { user_id: decoded.userId }
            })

            // Create new VKYC documents with correct enum value
            await prisma.vkycDocument.createMany({
                data: documents.map((doc: { type?: string; document_type?: string; url?: string; document_url?: string }) => ({
                    user_id: decoded.userId,
                    document_type: doc.type || doc.document_type || 'unknown',
                    document_url: doc.url || doc.document_url || '',
                    kyc_type: finalKycType
                }))
            })
        }

        // Fetch updated profile with related data
        const profileWithData = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: {
                advocateProfile: true,
                vkycDocuments: true
            }
        })

        return NextResponse.json({
            success: true,
            profile: profileWithData,
            message: 'VKYC completed successfully',
            kycType: finalKycType
        })
    } catch (error) {
        console.error('VKYC completion error:', error)
        return NextResponse.json({
            error: 'VKYC completion failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}