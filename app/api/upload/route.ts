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

        // Validate file type - more specific PDF validation
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
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

        // Convert file to buffer for proper handling
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate PDF file signature
        const pdfSignature = buffer.slice(0, 4).toString();
        if (pdfSignature !== '%PDF') {
            return NextResponse.json(
                { error: 'Invalid PDF file format' },
                { status: 400 }
            );
        }

        try {
            // Upload PDF as image type directly - this allows Cloudinary to process it
            const uploadResponse = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image', // Changed to 'image' to enable PDF processing
                        folder: `legal-documents/${session.user.id}`,
                        use_filename: true,
                        unique_filename: true,
                        overwrite: false,
                        public_id: `legal_doc_${Date.now()}`,
                        access_mode: 'public',
                        delivery_type: 'upload',
                        format: 'pdf', // Keep original as PDF
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload stream error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                ).end(buffer);
            }) as any;

            // Generate different URLs
            const pdfUrl = uploadResponse.secure_url; // Original PDF URL

            // Generate JPEG preview URL from the uploaded PDF
            const previewUrl = cloudinary.url(uploadResponse.public_id, {
                resource_type: 'image',
                type: 'upload',
                secure: true,
                transformation: [
                    { page: 1 }, // First page
                    { format: 'jpg' },
                    { quality: 'auto:good' },
                    { width: 600 }, // Set width for preview
                    { height: 800 }, // Set height for preview
                    { crop: 'fit' } // Maintain aspect ratio
                ]
            });

            // Generate thumbnail URL
            const thumbnailUrl = cloudinary.url(uploadResponse.public_id, {
                resource_type: 'image',
                type: 'upload',
                secure: true,
                transformation: [
                    { page: 1 },
                    { format: 'jpg' },
                    { quality: 'auto:good' },
                    { width: 200 },
                    { height: 260 },
                    { crop: 'fit' }
                ]
            });

            console.log('Upload successful:', {
                public_id: uploadResponse.public_id,
                pdf_url: pdfUrl,
                preview_url: previewUrl,
                thumbnail_url: thumbnailUrl,
                file_size: uploadResponse.bytes,
                format: uploadResponse.format
            });

            return NextResponse.json({
                url: pdfUrl,
                secure_url: pdfUrl,
                preview_url: previewUrl,
                thumbnail_url: thumbnailUrl,
                public_id: uploadResponse.public_id,
                file_size: uploadResponse.bytes,
                format: uploadResponse.format || 'pdf',
                success: true
            });

        } catch (cloudinaryError: any) {
            console.error('Cloudinary upload error:', cloudinaryError);

            // Handle untrusted account error specifically
            if (cloudinaryError.message?.includes('untrusted') || cloudinaryError.error?.message?.includes('untrusted')) {
                // Try fallback method for untrusted accounts
                try {
                    console.log('Retrying with fallback method for untrusted account...');

                    const base64 = buffer.toString('base64');
                    const dataURI = `data:application/pdf;base64,${base64}`;

                    // Upload as raw for untrusted accounts
                    const fallbackResponse = await cloudinary.uploader.upload(dataURI, {
                        resource_type: 'raw',
                        folder: `legal-documents/${session.user.id}`,
                        public_id: `legal_doc_${Date.now()}`,
                        access_mode: 'public'
                    });

                    // For untrusted accounts, we can't generate previews
                    return NextResponse.json({
                        url: fallbackResponse.secure_url,
                        secure_url: fallbackResponse.secure_url,
                        preview_url: null,
                        thumbnail_url: null,
                        public_id: fallbackResponse.public_id,
                        file_size: fallbackResponse.bytes,
                        format: 'pdf',
                        success: true,
                        method: 'fallback_raw_upload',
                        note: 'Preview generation unavailable for unverified accounts'
                    });

                } catch (fallbackError) {
                    console.error('Fallback upload also failed:', fallbackError);
                    return NextResponse.json(
                        {
                            error: 'Your Cloudinary account needs verification. Please contact Cloudinary support to enable PDF processing, or use a verified account.',
                            details: 'Account marked as untrusted'
                        },
                        { status: 403 }
                    );
                }
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