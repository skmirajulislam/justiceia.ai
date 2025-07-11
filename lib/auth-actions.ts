"use server"

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import  prisma  from '@/lib/prisma'

export async function loginAction(email: string, password: string) {
    try {
        const profile = await prisma.profile.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                first_name: true,
                last_name: true,
                role: true,
                vkyc_completed: true
            }
        })

        if (!profile || !profile.password) {
            return { error: 'Invalid credentials' }
        }

        const isValidPassword = await bcrypt.compare(password, profile.password)
        if (!isValidPassword) {
            return { error: 'Invalid credentials' }
        }

        const token = jwt.sign(
            { userId: profile.id },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        )

        const cookieStore = await cookies()
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
        })

        return {
            success: true,
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name} ${profile.last_name}`.trim()
            }
        }
    } catch (error) {
        return { error: 'Internal server error' }
    }
}

export async function registerAction(userData: any) {
    "use server"

    try {
        const hashedPassword = await bcrypt.hash(userData.password, 12)

        const profile = await prisma.profile.create({
            data: {
                email: userData.email,
                password: hashedPassword,
                first_name: userData.firstName,
                last_name: userData.lastName,
                phone: userData.phone,
                address: userData.address,
                role: userData.role || 'user',
                created_at: new Date(),
                updated_at: new Date(),
                vkyc_completed: false
            }
        })

        return { success: true, userId: profile.id }
    } catch (error) {
        return { error: 'Registration failed' }
    }
}