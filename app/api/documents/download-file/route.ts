import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileUrl = searchParams.get('url');
        const filename = searchParams.get('filename') || 'legal_document.pdf';

        if (!fileUrl) {
            return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
        }

        // Fetch remote file on server side
        const res = await fetch(fileUrl);
        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch document file' }, { status: res.status });
        }

        const arrayBuffer = await res.arrayBuffer();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim().replace(/\s+/g, '_');
        const finalFilename = sanitizedFilename.endsWith('.pdf') ? sanitizedFilename : `${sanitizedFilename}.pdf`;

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${finalFilename}"`,
                'Content-Length': arrayBuffer.byteLength.toString(),
                'Cache-Control': 'no-cache',
            },
        });
    } catch (error: any) {
        console.error('Download proxy error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
