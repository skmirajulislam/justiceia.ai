import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/integrations/client'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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
                vkyc_completed: true,
                vkyc_completed_at: true,
                created_at: true,
                updated_at: true
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

        const profile = await prisma.profile.update({
            where: { id },
            data: {
                ...data,
                updated_at: new Date()
            },
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
                updated_at: true
            }
        })

        return NextResponse.json(profile)
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

        await prisma.report.deleteMany({
            where: { user_id: id }
        })

        await prisma.profile.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Profile DELETE error:', error)
        return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json()
        const { firstName, lastName, email, phone, address, role } = data

        const profile = await prisma.profile.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                address,
                role: role || 'user',
                created_at: new Date(),
                updated_at: new Date(),
                vkyc_completed: false
            }
        })

        return NextResponse.json(profile, { status: 201 })
    } catch (error) {
        console.error('Profile POST error:', error)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }
}