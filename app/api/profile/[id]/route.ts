import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserRole } from '@/app/generated/prisma'

async function getAuthUserId(): Promise<string | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value
        if (!token) return null

        const jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret) return null

        const decoded = jwt.verify(token, jwtSecret) as { userId: string }
        return decoded?.userId || null
    } catch {
        return null
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUserId = await getAuthUserId()
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const profile = await prisma.profile.findUnique({
            where: { id },
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
                vkycDocuments: true,
                reports: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        created_at: true
                    }
                }
            }
        })

        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Profile fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUserId = await getAuthUserId()
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        if (authUserId !== id) {
            return NextResponse.json({ error: 'Forbidden: You cannot modify another user\'s profile' }, { status: 403 })
        }

        const data = await req.json()

        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json(
                { error: 'No data provided for update' },
                { status: 400 }
            )
        }

        const existingProfile = await prisma.profile.findUnique({
            where: { id }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Whitelist allowed fields for safe updates
        const updateData: Record<string, any> = {
            updated_at: new Date()
        }

        if (data.firstName !== undefined || data.first_name !== undefined) {
            updateData.first_name = data.firstName || data.first_name
        }
        if (data.lastName !== undefined || data.last_name !== undefined) {
            updateData.last_name = data.lastName || data.last_name
        }
        if (data.phone !== undefined) {
            updateData.phone = data.phone
        }
        if (data.address !== undefined) {
            updateData.address = data.address
        }

        // Handle role change only if valid enum
        if (data.role) {
            const roleStr = String(data.role).toUpperCase()
            if (Object.values(UserRole).includes(roleStr as UserRole)) {
                // If role changed from/to professional, handle advocate profile
                const isExistingProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(existingProfile.role)
                const isNewProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(roleStr)

                updateData.role = roleStr as UserRole

                if (isNewProf && !isExistingProf) {
                    await prisma.advocateProfile.upsert({
                        where: { user_id: id },
                        update: {},
                        create: {
                            user_id: id,
                            specialization: [],
                            experience: 0,
                            hourly_rate: 0,
                            certifications: [],
                            languages: [],
                            is_verified: false,
                            is_available: true
                        }
                    })
                }
            }
        }

        const updatedProfile = await prisma.profile.update({
            where: { id },
            data: updateData,
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
                advocateProfile: true
            }
        })

        return NextResponse.json({
            success: true,
            profile: updatedProfile,
            message: 'Profile updated successfully'
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authUserId = await getAuthUserId()
        if (!authUserId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        if (authUserId !== id) {
            return NextResponse.json({ error: 'Forbidden: You cannot delete another user\'s profile' }, { status: 403 })
        }

        const existingProfile = await prisma.profile.findUnique({
            where: { id }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Cleanup related data
        await prisma.payment.deleteMany({
            where: { OR: [{ client_id: id }, { advocate_id: id }] }
        })

        await prisma.consultationRequest.deleteMany({
            where: { OR: [{ client_id: id }, { advocate_id: id }] }
        })

        await prisma.accessGrant.deleteMany({
            where: { user_id: id }
        })

        await prisma.chatMessage.deleteMany({
            where: { OR: [{ sender_id: id }, { receiver_id: id }] }
        })

        await prisma.videoCall.deleteMany({
            where: { OR: [{ client_id: id }, { advocate_id: id }] }
        })

        await prisma.monthlyEarnings.deleteMany({
            where: { advocate_id: id }
        })

        await prisma.profile.delete({
            where: { id }
        })

        const response = NextResponse.json({
            success: true,
            message: 'Profile and all related data deleted successfully'
        })

        response.cookies.delete('auth-token')
        return response
    } catch (error) {
        console.error('Profile DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }
}