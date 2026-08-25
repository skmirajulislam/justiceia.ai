import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserRole } from '@/app/generated/prisma'
import bcrypt from 'bcryptjs'

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

        // Fetch user profile without exposing password
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

        return NextResponse.json({
            success: true,
            profile
        })
    } catch (error) {
        console.error('Profile fetch error:', error)
        return NextResponse.json({
            error: 'Failed to fetch profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
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
        const data = await req.json()

        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: { advocateProfile: true }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

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

        // Handle password update
        if (data.password && typeof data.password === 'string' && data.password.length >= 6) {
            updateData.password = await bcrypt.hash(data.password, 12)
        }

        // Handle role change only if valid enum
        if (data.role) {
            const roleStr = String(data.role).toUpperCase()
            if (Object.values(UserRole).includes(roleStr as UserRole)) {
                const isExistingProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(existingProfile.role)
                const isNewProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(roleStr)

                updateData.role = roleStr as UserRole

                if (isNewProf && !isExistingProf) {
                    await prisma.advocateProfile.upsert({
                        where: { user_id: decoded.userId },
                        update: {},
                        create: {
                            user_id: decoded.userId,
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
            where: { id: decoded.userId },
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
                advocateProfile: true,
                vkycDocuments: true
            }
        })

        return NextResponse.json({
            success: true,
            profile: updatedProfile,
            message: 'Profile updated successfully.'
        })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({
            error: 'Failed to update profile',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

export async function DELETE() {
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

        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Delete user related records
        await prisma.payment.deleteMany({
            where: { OR: [{ client_id: decoded.userId }, { advocate_id: decoded.userId }] }
        })

        await prisma.consultationRequest.deleteMany({
            where: { OR: [{ client_id: decoded.userId }, { advocate_id: decoded.userId }] }
        })

        await prisma.accessGrant.deleteMany({
            where: { user_id: decoded.userId }
        })

        await prisma.chatMessage.deleteMany({
            where: { OR: [{ sender_id: decoded.userId }, { receiver_id: decoded.userId }] }
        })

        await prisma.videoCall.deleteMany({
            where: { OR: [{ client_id: decoded.userId }, { advocate_id: decoded.userId }] }
        })

        await prisma.monthlyEarnings.deleteMany({
            where: { advocate_id: decoded.userId }
        })

        await prisma.profile.delete({
            where: { id: decoded.userId }
        })

        const response = NextResponse.json({
            success: true,
            message: 'Account deleted successfully'
        })

        response.cookies.delete('auth-token')
        return response
    } catch (error) {
        console.error('Account deletion error:', error)
        return NextResponse.json({
            error: 'Failed to delete account',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
