"use server"

import { prisma } from '@/integrations/client'

export async function getProfileAction(userId: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { id: userId },
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
                created_at: true,
                updated_at: true
            }
        })

        return profile
    } catch (error) {
        console.error('Profile fetch error:', error)
        return null
    }
}

export async function updateProfileAction(userId: string, data: any) {
    try {
        const profile = await prisma.profile.update({
            where: { id: userId },
            data: {
                ...data,
                updated_at: new Date()
            }
        })

        return { success: true, profile }
    } catch (error) {
        return { error: 'Update failed' }
    }
}