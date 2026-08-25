"use server"

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

async function getAuthenticatedUserId(): Promise<string | null> {
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

export async function getProfileAction(userId: string) {
    try {
        const authUserId = await getAuthenticatedUserId()
        if (!authUserId) {
            return null
        }

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
                kyc_type: true,
                vkyc_completed: true,
                vkyc_completed_at: true,
                can_upload_reports: true,
                created_at: true,
                updated_at: true,
                advocateProfile: true
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
        const authUserId = await getAuthenticatedUserId()
        if (!authUserId || authUserId !== userId) {
            return { error: 'Unauthorized' }
        }

        // Whitelist allowed fields to prevent arbitrary role/permission modification
        const allowedData: Record<string, any> = {}
        if (typeof data.first_name === 'string') allowedData.first_name = data.first_name
        if (typeof data.last_name === 'string') allowedData.last_name = data.last_name
        if (typeof data.phone === 'string') allowedData.phone = data.phone
        if (typeof data.address === 'string') allowedData.address = data.address

        allowedData.updated_at = new Date()

        const profile = await prisma.profile.update({
            where: { id: userId },
            data: allowedData,
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
                updated_at: true
            }
        })

        return { success: true, profile }
    } catch (error) {
        console.error('Profile update error:', error)
        return { error: 'Update failed' }
    }
}