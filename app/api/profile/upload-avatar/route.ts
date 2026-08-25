import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { deleteUploadThingFiles } from '@/lib/uploadthingServer';

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

        let decoded: { userId: string };
        try {
            decoded = jwt.verify(token, jwtSecret) as { userId: string };
        } catch {
            return NextResponse.json({ error: 'Invalid authentication session' }, { status: 401 });
        }

        const userId = decoded.userId;

        // Fetch existing user to find previous avatar for cleanup
        const existingProfile = await prisma.profile.findUnique({
            where: { id: userId },
            include: { advocateProfile: true }
        });

        if (!existingProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        let fileToUpload: File | null = null;
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json();
            if (body.image) {
                const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
                const mimeMatch = body.image.match(/^data:(image\/\w+);base64,/);
                const mimeType = mimeMatch ? mimeMatch[1] : (body.fileType || 'image/jpeg');
                const extension = mimeType.split('/')[1] || 'jpg';
                const buffer = Buffer.from(base64Data, 'base64');
                const fileName = `avatar_${userId}_${Date.now()}.${extension}`;
                fileToUpload = new File([buffer], fileName, { type: mimeType });
            }
        } else {
            try {
                const formData = await req.formData();
                const formFile = formData.get('file') as File | null;
                if (formFile) {
                    fileToUpload = formFile;
                }
            } catch (formErr) {
                console.warn('FormData parse error, attempting fallback json:', formErr);
            }
        }

        if (!fileToUpload) {
            return NextResponse.json({ error: 'No image file or base64 data provided for upload' }, { status: 400 });
        }

        // Clean up previous avatar from UploadThing storage if present
        const oldKeys = [
            existingProfile.avatar_key,
            existingProfile.avatar_url,
            existingProfile.advocateProfile?.image_key,
            existingProfile.advocateProfile?.image_url
        ].filter(Boolean);

        if (oldKeys.length > 0) {
            try {
                await deleteUploadThingFiles(oldKeys);
            } catch (cleanupErr) {
                console.warn('Non-fatal previous avatar cleanup warning:', cleanupErr);
            }
        }

        // Upload new avatar to UploadThing
        const uploadResult = await utapi.uploadFiles(fileToUpload);

        if (uploadResult.error) {
            throw new Error(`UploadThing error: ${uploadResult.error.message}`);
        }

        const newUrl = uploadResult.data.ufsUrl || (uploadResult.data as any).url;
        const newKey = uploadResult.data.key;

        // Persist avatar to Profile in database
        await prisma.profile.update({
            where: { id: userId },
            data: {
                avatar_url: newUrl,
                avatar_key: newKey,
                updated_at: new Date()
            }
        });

        // If user is an advocate, sync image_url and image_key in advocate_profiles too
        if (existingProfile.advocateProfile) {
            await prisma.advocateProfile.update({
                where: { user_id: userId },
                data: {
                    image_url: newUrl,
                    image_key: newKey,
                    updated_at: new Date()
                }
            });
        }

        return NextResponse.json({
            success: true,
            avatar_url: newUrl,
            avatar_key: newKey,
            message: 'Profile photo updated and previous storage cleared successfully'
        });

    } catch (error: any) {
        console.error('Avatar upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload profile picture' },
            { status: 500 }
        );
    }
}
