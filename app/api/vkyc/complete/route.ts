import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/integrations/client'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const { profileData, documents, kycType } = await req.json()

        // Update profile
        const updatedProfile = await prisma.profile.update({
            where: { id: decoded.userId },
            data: {
                ...profileData,
                vkyc_completed: true,
                vkyc_completed_at: new Date(),
                updated_at: new Date()
            }
        })

        // Save document records (Fixed: vkycDocument -> vkycDocument with correct casing)
        if (documents && documents.length > 0) {
            await prisma.vkycDocument.createMany({
                data: documents.map((doc: any) => ({
                    user_id: decoded.userId,
                    document_type: doc.type,
                    document_url: doc.url,
                    kyc_type: kycType
                }))
            })
        }

        return NextResponse.json({ success: true, profile: updatedProfile })
    } catch (error) {
        console.error('VKYC completion error:', error)
        return NextResponse.json({ error: 'VKYC completion failed' }, { status: 500 })
    }
}