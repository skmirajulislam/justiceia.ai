import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/integrations/client'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import cloudinary from '@/lib/cloudinary'

// GET - Fetch user reports
export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }

        const reports = await prisma.report.findMany({
            where: { user_id: decoded.userId },
            orderBy: { created_at: 'desc' }
        })

        return NextResponse.json({ reports })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
    }
}

// POST - Create new report
export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const { title, category, description, pdf_url } = await req.json()

        const report = await prisma.report.create({
            data: {
                user_id: decoded.userId,
                title,
                category,
                description,
                pdf_url
            }
        })

        return NextResponse.json({ success: true, report })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
    }
}

// DELETE - Delete report
export async function DELETE(req: NextRequest) {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
        const { searchParams } = new URL(req.url)
        const reportId = searchParams.get('id')
        const publicId = searchParams.get('publicId')

        if (!reportId) {
            return NextResponse.json({ error: 'Report ID required' }, { status: 400 })
        }

        // Delete from database
        await prisma.report.delete({
            where: {
                id: reportId,
                user_id: decoded.userId // Ensure user owns the report
            }
        })

        // Delete from Cloudinary
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
    }
}