import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { UserRole } from '@/app/generated/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const profile = await prisma.profile.findUnique({
            where: { id },
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
        const { id } = await params
        const data = await req.json()

        console.log('Profile update request for ID:', id)
        console.log('Update data received:', JSON.stringify(data, null, 2))

        // Validate required fields
        if (!data || Object.keys(data).length === 0) {
            console.log('Error: No data provided for update')
            return NextResponse.json(
                { error: 'No data provided for update' },
                { status: 400 }
            )
        }

        // Map camelCase fields from frontend to snake_case for database
        const fieldMapping: { [key: string]: string } = {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'email': 'email',
            'phone': 'phone',
            'address': 'address',
            'role': 'role'
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
                console.log('Valid roles:', Object.values(UserRole))
                return NextResponse.json(
                    { error: `Invalid role provided: ${mappedData.role}` },
                    { status: 400 }
                )
            }
        }

        // Check if user exists
        const existingProfile = await prisma.profile.findUnique({
            where: { id },
            include: { advocateProfile: true }
        })

        if (!existingProfile) {
            console.log('Error: Profile not found for ID:', id)
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        console.log('Existing profile found:', existingProfile.email)

        // Determine if this is a significant profile update that requires VKYC re-verification
        const significantFields = ['first_name', 'last_name', 'phone', 'address', 'role'] as const
        const isSignificantUpdate = significantFields.some(field => {
            const fieldKey = field as keyof typeof existingProfile
            return mappedData[field] !== undefined && mappedData[field] !== existingProfile[fieldKey]
        })

        console.log('Is significant update:', isSignificantUpdate)

        // Handle role change logic
        const professionalRoles = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL']
        const isChangingToProfessional = mappedData.role && professionalRoles.includes(mappedData.role as string) && !professionalRoles.includes(existingProfile.role)
        const isChangingFromProfessional = professionalRoles.includes(existingProfile.role) && mappedData.role && !professionalRoles.includes(mappedData.role as string)

        // Prepare update data - reset VKYC if significant update
        const updateData = {
            ...mappedData,
            updated_at: new Date(),
            // Reset VKYC if significant profile changes
            ...(isSignificantUpdate && {
                vkyc_completed: false,
                vkyc_completed_at: null
            })
        }

        console.log('Final update data:', JSON.stringify(updateData, null, 2))

        // Update profile
        await prisma.profile.update({
            where: { id },
            data: updateData
        })

        // If VKYC was reset due to significant changes, also clear VKYC documents
        if (isSignificantUpdate && existingProfile.vkyc_completed) {
            console.log('Clearing VKYC documents due to significant profile update')
            await prisma.vkycDocument.deleteMany({
                where: { user_id: id }
            })
        }

        // Handle advocate profile creation/deletion based on role change
        if (isChangingToProfessional && !existingProfile.advocateProfile) {
            // Create advocate profile when changing to advocate role
            await prisma.advocateProfile.create({
                data: {
                    user_id: id,
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
                where: { user_id: id }
            })
        }

        // Return updated profile with related data
        const updatedProfile = await prisma.profile.findUnique({
            where: { id },
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

        console.log('Profile update successful:', response.message)
        return NextResponse.json(response)
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
        const { id } = await params

        // Check if user exists
        const existingProfile = await prisma.profile.findUnique({
            where: { id }
        })

        if (!existingProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        // Delete user and all related data in the correct order
        // Due to onDelete: Cascade in schema, most relations will be automatically deleted
        // But we'll explicitly handle some to ensure proper cleanup

        // 1. Delete payment records where user is client or advocate
        await prisma.payment.deleteMany({
            where: {
                OR: [
                    { client_id: id },
                    { advocate_id: id }
                ]
            }
        })

        // 2. Delete consultation requests where user is client or advocate
        await prisma.consultationRequest.deleteMany({
            where: {
                OR: [
                    { client_id: id },
                    { advocate_id: id }
                ]
            }
        })

        // 3. Delete access grants
        await prisma.accessGrant.deleteMany({
            where: { user_id: id }
        })

        // 4. Delete chat messages where user is sender or receiver
        await prisma.chatMessage.deleteMany({
            where: {
                OR: [
                    { sender_id: id },
                    { receiver_id: id }
                ]
            }
        })

        // 5. Delete video calls where user is client or advocate
        await prisma.videoCall.deleteMany({
            where: {
                OR: [
                    { client_id: id },
                    { advocate_id: id }
                ]
            }
        })

        // 6. Delete monthly earnings (for advocates)
        await prisma.monthlyEarnings.deleteMany({
            where: { advocate_id: id }
        })

        // 7. Now delete the profile (this will cascade delete reports, vkyc documents, and advocate profile)
        await prisma.profile.delete({
            where: { id }
        })

        return NextResponse.json({
            success: true,
            message: 'Profile and all related data deleted successfully'
        })
    } catch (error) {
        console.error('Profile DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }
}