import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const utapi = new UTApi();

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        let decoded: { userId: string; email?: string };
        try {
            decoded = jwt.verify(token, jwtSecret) as { userId: string; email?: string };
        } catch {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Fetch user data from database
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                vkyc_completed: true,
                can_upload_reports: true,
                role: true,
            },
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const uploadType = formData.get('type') as string; // 'report' or 'document'

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // If uploading a report, check if user has permission
        const isProfessional = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(profile.role);
        if (uploadType === 'report' && !profile.can_upload_reports && !isProfessional) {
            return NextResponse.json(
                { error: 'You do not have permission to upload reports. Only professional users (barristers, lawyers, government officials) can upload reports.' },
                { status: 403 }
            );
        }

        // Validate file type - PDF validation
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (max 16MB)
        if (file.size > 16 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size too large. Maximum size is 16MB.' },
                { status: 400 }
            );
        }

        // Upload to UploadThing using UTApi
        const uploadResult = await utapi.uploadFiles(file);

        if (uploadResult.error) {
            console.error('UploadThing error:', uploadResult.error);
            return NextResponse.json(
                { error: `Upload failed: ${uploadResult.error.message}` },
                { status: 500 }
            );
        }

        const fileData = uploadResult.data;
        const fileUrl = fileData.ufsUrl || (fileData as any).url;

        return NextResponse.json({
            url: fileUrl,
            secure_url: fileUrl,
            preview_url: null,
            thumbnail_url: null,
            public_id: fileData.key,
            key: fileData.key,
            file_size: fileData.size,
            format: 'pdf',
            success: true,
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}