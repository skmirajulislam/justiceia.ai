import { NextRequest, NextResponse } from 'next/server'
import cloudinary from '@/lib/cloudinary'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
    try {
        // Verify authentication
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const { image, documentType } = await req.json()

        if (!image || !documentType) {
            return NextResponse.json({ error: 'Missing image or document type' }, { status: 400 })
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: `vkyc-documents/${decoded.userId}`,
            public_id: `${documentType}_${Date.now()}`,
            resource_type: 'image',
            transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        })

        return NextResponse.json({
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
        })

    } catch (error) {
        console.error('Photo upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}