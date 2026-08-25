import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const utapi = new UTApi();

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
        const { image, documentType } = await req.json();

        if (!image || !documentType) {
            return NextResponse.json({ error: 'Missing image or document type' }, { status: 400 });
        }

        // Convert base64 data URL to Buffer/File
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${documentType}_${decoded.userId}_${Date.now()}.jpg`;
        const file = new File([buffer], fileName, { type: 'image/jpeg' });

        const uploadResult = await utapi.uploadFiles(file);

        if (uploadResult.error) {
            throw new Error(uploadResult.error.message);
        }

        return NextResponse.json({
            success: true,
            url: uploadResult.data.url,
            key: uploadResult.data.key,
            publicId: uploadResult.data.key,
        });
    } catch (error: any) {
        console.error('Photo upload error:', error);
        return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
    }
}