import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
    try {
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
            // Upload to Cloudinary with specific options
            const uploadResponse = await cloudinary.uploader.upload(dataURI, {
                resource_type: 'raw', // Use 'raw' for PDFs
                folder: 'legal-documents',
                use_filename: true,
                unique_filename: true,
                overwrite: false,
                public_id: `pdf_${Date.now()}`,
                access_mode: 'public', // Ensure public access
                delivery_type: 'upload',
                flags: 'attachment'
            });

            // Generate a direct URL for the PDF
            const directUrl = cloudinary.url(uploadResponse.public_id, {
                resource_type: 'raw',
                type: 'upload',
                secure: true
            });

            console.log('Upload successful:', {
                public_id: uploadResponse.public_id,
                secure_url: uploadResponse.secure_url,
                direct_url: directUrl
            });

            return NextResponse.json({
                url: directUrl, // Use direct URL instead of secure_url
                public_id: uploadResponse.public_id,
                secure_url: uploadResponse.secure_url,
                success: true
            });

        } catch (cloudinaryError: any) {
            console.error('Cloudinary upload error:', cloudinaryError);

            // Handle specific Cloudinary errors
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