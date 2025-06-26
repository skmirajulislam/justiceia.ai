import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import jwt from 'jsonwebtoken';
import { prisma } from '@/integrations/client';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    try {
        // Check authentication using your custom JWT method
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
        } catch (error) {
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
                vkyc_completed: true
            }
        });

        if (!profile) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 401 }
            );
        }

        // Create session-like object for compatibility
        const session = {
            user: {
                id: profile.id,
                email: profile.email,
                vkyc_completed: profile.vkyc_completed
            }
        };

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.includes('pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size too large. Maximum size is 10MB.' },
                { status: 400 }
            );
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataURI = `data:${file.type};base64,${base64}`;

        try {
            // Upload to Cloudinary with user-specific folder
            const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                resource_type: 'raw',
                folder: `legal-documents/${session.user.id}`,
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                public_id: `legal_doc_${Date.now()}`,
                access_mode: 'public',
                delivery_type: 'upload',
                flags: 'attachment'
            });

            // Generate a direct URL for the PDF
            const directUrl = cloudinary.url(uploadResponse.public_id, {
                resource_type: 'raw',
                type: 'upload',
                secure: true,
                flags: 'attachment'
            });

            console.log('Upload successful:', {
                public_id: uploadResponse.public_id,
                secure_url: uploadResponse.secure_url,
                direct_url: directUrl
            });

            return NextResponse.json({
                url: directUrl,
                public_id: uploadResponse.public_id,
                secure_url: uploadResponse.secure_url,
                success: true
            });

        } catch (cloudinaryError: any) {
            console.error('Cloudinary upload error:', cloudinaryError);

            if (cloudinaryError.message?.includes('untrusted')) {
                return NextResponse.json(
                    { error: 'File upload service temporarily unavailable. Please try again later or contact support.' },
                    { status: 503 }
                );
            }

            return NextResponse.json(
                { error: 'Failed to upload file. Please try again.' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again.' },
            { status: 500 }
        );
    }
}