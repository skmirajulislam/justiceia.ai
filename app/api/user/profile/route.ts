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

        // Fetch user profile with related data
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: {
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

        console.log('User profile update request for user:', decoded.userId)
        console.log('Update data received:', JSON.stringify(data, null, 2))

        // Map camelCase fields from frontend to snake_case for database
        const fieldMapping: { [key: string]: string } = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'email': 'email',
            'phone': 'phone',
            'address': 'address',
            'role': 'role',
            'password': 'password'
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedData: Record<string, any> = {};
        Object.keys(data).forEach(key => {
            const mappedKey = fieldMapping[key] || key;
            mappedData[mappedKey] = data[key];
        });

        console.log('Mapped data for database:', JSON.stringify(mappedData, null, 2))

        // Validate role if being updated
        if (mappedData.role) {
            // Convert role values to uppercase to match enum
            const roleMapping: { [key: string]: string } = {
                'user': 'REGULAR_USER',
                'regular_user': 'REGULAR_USER',
                'barrister': 'BARRISTER',
                'lawyer': 'LAWYER',
                'government_official': 'GOVERNMENT_OFFICIAL'
            };

            // If role is in mapping, convert it
            if (roleMapping[mappedData.role.toLowerCase()]) {
                mappedData.role = roleMapping[mappedData.role.toLowerCase()];
            }

            // Validate the role
            if (!Object.values(UserRole).includes(mappedData.role as UserRole)) {
                console.log('Error: Invalid role provided:', mappedData.role)
                return NextResponse.json(
                    { error: `Invalid role provided: ${mappedData.role}` },
                    { status: 400 }
                )
            }
        }

        // Check if user exists
        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: { advocateProfile: true }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Determine if this is a significant profile update that requires VKYC re-verification
        const significantFields = ['first_name', 'last_name', 'phone', 'address', 'role'] as const
        const isSignificantUpdate = significantFields.some(field => {
            const fieldKey = field as keyof typeof existingProfile
            return mappedData[field] !== undefined && mappedData[field] !== existingProfile[fieldKey]
        })

        console.log('Is significant update:', isSignificantUpdate)

        // Handle password update if provided
        const updateData = { ...mappedData }
        if (mappedData.password) {
            updateData.password = await bcrypt.hash(mappedData.password as string, 12)
        }

        // Reset VKYC if significant update
        if (isSignificantUpdate) {
            updateData.vkyc_completed = false
            updateData.vkyc_completed_at = null
        }

        // Handle role change logic
        const professionalRoles = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL']
        const isChangingToProfessional = mappedData.role && professionalRoles.includes(mappedData.role as string) && !professionalRoles.includes(existingProfile.role)
        const isChangingFromProfessional = professionalRoles.includes(existingProfile.role) && mappedData.role && !professionalRoles.includes(mappedData.role as string)

        // Update profile
        await prisma.profile.update({
            where: { id: decoded.userId },
            data: {
                ...updateData,
                updated_at: new Date()
            }
        })

        // If VKYC was reset due to significant changes, also clear VKYC documents
        if (isSignificantUpdate && existingProfile.vkyc_completed) {
            console.log('Clearing VKYC documents due to significant profile update')
            await prisma.vkycDocument.deleteMany({
                where: { user_id: decoded.userId }
            })
        }

        // Handle advocate profile creation/deletion based on role change
        if (isChangingToProfessional && !existingProfile.advocateProfile) {
            // Create advocate profile when changing to advocate role
            await prisma.advocateProfile.create({
                data: {
                    user_id: decoded.userId,
                    specialization: [],
                    experience: 0,
                    hourly_rate: 0,
                    certifications: [],
                    languages: [],
                    is_verified: false,
                    is_available: true,
                    total_consultations: 0,
                    total_earnings: 0,
                    rating: 0
                }
            })
        } else if (isChangingFromProfessional && existingProfile.advocateProfile) {
            // Delete advocate profile when changing from advocate role
            await prisma.advocateProfile.delete({
                where: { user_id: decoded.userId }
            })
        }

        // Return updated profile with related data
        const updatedProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            include: {
                advocateProfile: true,
                vkycDocuments: true
            }
        })

        const response = {
            success: true,
            profile: updatedProfile,
            message: isSignificantUpdate
                ? 'Profile updated successfully. VKYC verification is required due to significant changes.'
                : 'Profile updated successfully.',
            vkyc_reset: isSignificantUpdate,
            requires_vkyc: isSignificantUpdate
        }

        console.log('User profile update successful:', response.message)
        return NextResponse.json(response)
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

        // Check if user exists
        const existingProfile = await prisma.profile.findUnique({
            where: { id: decoded.userId }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Delete user and all related data (same as admin delete)
        // 1. Delete payment records where user is client or advocate
        await prisma.payment.deleteMany({
            where: {
                OR: [
                    { client_id: decoded.userId },
                    { advocate_id: decoded.userId }
                ]
            }
        })

        // 2. Delete consultation requests where user is client or advocate
        await prisma.consultationRequest.deleteMany({
            where: {
                OR: [
                    { client_id: decoded.userId },
                    { advocate_id: decoded.userId }
                ]
            }
        })

        // 3. Delete access grants
        await prisma.accessGrant.deleteMany({
            where: { user_id: decoded.userId }
        })

        // 4. Delete chat messages where user is sender or receiver
        await prisma.chatMessage.deleteMany({
            where: {
                OR: [
                    { sender_id: decoded.userId },
                    { receiver_id: decoded.userId }
                ]
            }
        })

        // 5. Delete video calls where user is client or advocate
        await prisma.videoCall.deleteMany({
            where: {
                OR: [
                    { client_id: decoded.userId },
                    { advocate_id: decoded.userId }
                ]
            }
        })

        // 6. Delete monthly earnings (for advocates)
        await prisma.monthlyEarnings.deleteMany({
            where: { advocate_id: decoded.userId }
        })

        // 7. Now delete the profile (this will cascade delete reports, vkyc documents, and advocate profile)
        await prisma.profile.delete({
            where: { id: decoded.userId }
        })

        // Clear auth cookie
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
