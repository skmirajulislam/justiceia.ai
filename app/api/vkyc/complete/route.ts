import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { KycType } from '@/app/generated/prisma'
import { deleteUploadThingFiles } from '@/lib/uploadthingServer'

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
        const { profileData, documents } = await req.json()

        // Validate that user exists and get their role
        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Determine the correct KYC type based on user role
        let finalKycType: KycType = KycType.REGULAR;
        const isProfessional = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(existingProfile.role);
        if (isProfessional) {
            finalKycType = KycType.PROFESSIONAL;
        }

        // Whitelist profileData fields to prevent mass assignment
        const safeProfileUpdate: Record<string, any> = {
            vkyc_completed: true,
            vkyc_completed_at: new Date(),
            kyc_type: finalKycType,
            updated_at: new Date(),
        };

        if (isProfessional) {
            safeProfileUpdate.can_upload_reports = true;
        }

        if (profileData) {
            if (profileData.firstName || profileData.first_name) {
                safeProfileUpdate.first_name = profileData.firstName || profileData.first_name;
            }
            if (profileData.lastName || profileData.last_name) {
                safeProfileUpdate.last_name = profileData.lastName || profileData.last_name;
            }
            if (profileData.phone) {
                safeProfileUpdate.phone = profileData.phone;
            }
            if (profileData.address) {
                safeProfileUpdate.address = profileData.address;
            }
        }

        // Update profile
        await prisma.profile.update({
            where: { id: decoded.userId },
            data: safeProfileUpdate
        })

        // Save document records if provided
        if (documents && Array.isArray(documents) && documents.length > 0) {
            const oldDocs = await prisma.vkycDocument.findMany({
                where: { user_id: decoded.userId }
            });

            const newDocUrls = new Set(
                documents.map((d: any) => d.url || d.document_url).filter(Boolean)
            );

            const urlsToDelete = oldDocs
                .map(d => d.document_url)
                .filter(url => !newDocUrls.has(url));

            if (urlsToDelete.length > 0) {
                await deleteUploadThingFiles(urlsToDelete);
            }

            await prisma.vkycDocument.deleteMany({
                where: { user_id: decoded.userId }
            });

            await prisma.vkycDocument.createMany({
                data: documents.map((doc: { type?: string; document_type?: string; url?: string; document_url?: string }) => ({
                    user_id: decoded.userId,
                    document_type: doc.type || doc.document_type || 'identity_document',
                    document_url: doc.url || doc.document_url || '',
                    kyc_type: finalKycType
                }))
            });
        }

        // Fetch updated profile without exposing password
        const profileWithData = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
                address: true,
                role: true,
                kyc_type: true,
                vkyc_completed: true,
                vkyc_completed_at: true,
                can_upload_reports: true,
                created_at: true,
                updated_at: true,
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