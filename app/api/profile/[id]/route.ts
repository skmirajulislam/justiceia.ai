import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserRole } from '@/app/generated/prisma'
import { deleteUploadThingFiles } from '@/lib/uploadthingServer'

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
                vkycCertificate: true,
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
        let targetRole = existingProfile.role;
        if (data.role) {
            const roleStr = String(data.role).toUpperCase();
            if (Object.values(UserRole).includes(roleStr as UserRole)) {
                targetRole = roleStr as UserRole;
                const isExistingProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(existingProfile.role);
                const isNewProf = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(roleStr);

                updateData.role = targetRole;

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
                    });
                }
            }
        }

        const isProfessional = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(targetRole);

        // Update advocate profile fields if user is a legal professional
        if (isProfessional) {
            const advocateUpdate: Record<string, any> = {};
            if (data.specialization !== undefined) {
                advocateUpdate.specialization = Array.isArray(data.specialization)
                    ? data.specialization
                    : typeof data.specialization === 'string'
                        ? data.specialization.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
            }
            if (data.experience !== undefined) advocateUpdate.experience = Number(data.experience) || 0;
            if (data.hourly_rate !== undefined) advocateUpdate.hourly_rate = Number(data.hourly_rate) || 0;
            if (data.hourlyRate !== undefined) advocateUpdate.hourly_rate = Number(data.hourlyRate) || 0;
            if (data.location !== undefined) advocateUpdate.location = data.location || '';
            if (data.education !== undefined) advocateUpdate.education = data.education || '';
            if (data.bio !== undefined) advocateUpdate.bio = data.bio || '';
            if (data.languages !== undefined) {
                advocateUpdate.languages = Array.isArray(data.languages)
                    ? data.languages
                    : typeof data.languages === 'string'
                        ? data.languages.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
            }
            if (data.certifications !== undefined) {
                advocateUpdate.certifications = Array.isArray(data.certifications)
                    ? data.certifications
                    : typeof data.certifications === 'string'
                        ? data.certifications.split(',').map((s: string) => s.trim()).filter(Boolean)
                        : [];
            }

            await prisma.advocateProfile.upsert({
                where: { user_id: id },
                update: advocateUpdate,
                create: {
                    user_id: id,
                    specialization: advocateUpdate.specialization || [],
                    experience: advocateUpdate.experience || 0,
                    hourly_rate: advocateUpdate.hourly_rate || 0,
                    location: advocateUpdate.location || '',
                    education: advocateUpdate.education || '',
                    bio: advocateUpdate.bio || '',
                    languages: advocateUpdate.languages || [],
                    certifications: advocateUpdate.certifications || [],
                    is_verified: false,
                    is_available: true
                }
            });
        }

        if (isProfessional) {
            updateData.vkyc_completed = false;
            updateData.vkyc_completed_at = null;

            // Fetch and delete all old VKYC documents from UploadThing
            const oldVkycDocs = await prisma.vkycDocument.findMany({
                where: { user_id: id }
            });

            if (oldVkycDocs.length > 0) {
                const oldUrls = oldVkycDocs.map(doc => doc.document_url);
                await deleteUploadThingFiles(oldUrls);

                // Delete records from database
                await prisma.vkycDocument.deleteMany({
                    where: { user_id: id }
                });
            }

            // Remove/invalidate old certificate from DB
            await prisma.vkycCertificate.deleteMany({
                where: { user_id: id }
            });
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
                advocateProfile: true,
                vkycCertificate: true
            }
        });

        return NextResponse.json({
            success: true,
            profile: updatedProfile,
            requires_vkyc: isProfessional,
            message: isProfessional
                ? 'Profile updated. Security Policy: You must complete Video KYC verification before accessing legal features.'
                : 'Profile updated successfully'
        });
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