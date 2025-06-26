import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/integrations/client';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to get session from JWT token
async function getSession(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return null;
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

        // Fetch user data from database
        const profile = await prisma.profile.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                vkyc_completed: true
            }
        });

        if (!profile) {
            return null;
        }

        return {
            user: {
                id: profile.id,
                email: profile.email,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
                role: profile.role,
                vkyc_completed: profile.vkyc_completed
            }
        };
    } catch (error) {
        console.error('Session verification error:', error);
        return null;
    }
}

// GET - Fetch reports (with optional filtering)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const category = searchParams.get('category');
        const search = searchParams.get('search');

        let where: any = {};

        // If userId is provided, filter by user (for personal reports)
        if (userId) {
            where.user_id = userId;
        }

        // Filter by category
        if (category && category !== 'all') {
            where.category = category;
        }

        // Search functionality
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } }
            ];
        }

        try {
            const reports = await prisma.report.findMany({
                where,
                include: {
                    profile: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            role: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                }
            });

            // Always return success with reports array (empty if no data)
            return NextResponse.json({
                success: true,
                reports: reports.map(report => ({
                    ...report,
                    author: {
                        name: `${report.profile.first_name || ''} ${report.profile.last_name || ''}`.trim() || 'Anonymous',
                        role: report.profile.role,
                        email: report.profile.email
                    }
                }))
            });

        } catch (dbError) {
            console.error('Database error:', dbError);

            // Return empty array instead of error for database connection issues
            return NextResponse.json({
                success: true,
                reports: [],
                message: 'No reports available at the moment'
            });
        }

    } catch (error) {
        console.error('Error fetching reports:', error);

        // Return empty array instead of error
        return NextResponse.json({
            success: true,
            reports: [],
            message: 'No reports available at the moment'
        });
    }
}

// POST - Create new report
export async function POST(request: NextRequest) {
    try {
        const session = await getSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { title, category, description, pdf_url, cloudinary_public_id, tags, date, court } = body;

        if (!title || !category || !pdf_url) {
            return NextResponse.json(
                { error: 'Title, category, and PDF URL are required' },
                { status: 400 }
            );
        }

        const report = await prisma.report.create({
            data: {
                user_id: session.user.id,
                title,
                category,
                description,
                pdf_url,
                cloudinary_public_id,
                tags: tags || [],
                date: date ? new Date(date) : null,
                court
            },
            include: {
                profile: {
                    select: {
                        first_name: true,
                        last_name: true,
                        role: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            report: {
                ...report,
                author: {
                    name: `${report.profile.first_name || ''} ${report.profile.last_name || ''}`.trim() || 'Anonymous',
                    role: report.profile.role,
                    email: report.profile.email
                }
            }
        });

    } catch (error) {
        console.error('Error creating report:', error);
        return NextResponse.json(
            { error: 'Failed to create report' },
            { status: 500 }
        );
    }
}

// DELETE - Delete report
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const reportId = searchParams.get('id');

        if (!reportId) {
            return NextResponse.json(
                { error: 'Report ID is required' },
                { status: 400 }
            );
        }

        // First, find the report to verify ownership
        const report = await prisma.report.findUnique({
            where: { id: reportId }
        });

        if (!report) {
            return NextResponse.json(
                { error: 'Report not found' },
                { status: 404 }
            );
        }

        if (report.user_id !== session.user.id) {
            return NextResponse.json(
                { error: 'Unauthorized to delete this report' },
                { status: 403 }
            );
        }

        // Delete from Cloudinary if public_id is provided
        if (report.cloudinary_public_id) {
            try {
                await cloudinary.uploader.destroy(report.cloudinary_public_id, {
                    resource_type: 'raw'
                });
                console.log('Successfully deleted from Cloudinary:', report.cloudinary_public_id);
            } catch (cloudinaryError) {
                console.error('Error deleting from Cloudinary:', cloudinaryError);
                // Continue with database deletion even if Cloudinary deletion fails
            }
        }

        // Delete from database
        await prisma.report.delete({
            where: { id: reportId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting report:', error);
        return NextResponse.json(
            { error: 'Failed to delete report' },
            { status: 500 }
        );
    }
}