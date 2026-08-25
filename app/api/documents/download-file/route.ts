import { NextRequest, NextResponse } from 'next/server';

// Allowlist of trusted storage hostnames for SSRF protection
const ALLOWED_HOSTNAMES = [
    'utfs.io',
    'uploadthing.com',
];

// Patterns that match wildcard subdomains (e.g. *.ufs.sh)
const ALLOWED_HOSTNAME_SUFFIXES = [
    '.ufs.sh',
];

function isAllowedUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
        return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check exact hostname match
    if (ALLOWED_HOSTNAMES.includes(hostname)) {
        return true;
    }

    // Check wildcard suffix match (e.g. *.ufs.sh)
    if (ALLOWED_HOSTNAME_SUFFIXES.some(suffix => hostname === suffix.slice(1) || hostname.endsWith(suffix))) {
        return true;
    }

    return false;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileUrl = searchParams.get('url');
        const filename = searchParams.get('filename') || 'legal_document.pdf';

        if (!fileUrl) {
            return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
        }

        // Validate URL against allowlist to prevent SSRF attacks
        if (!isAllowedUrl(fileUrl)) {
            return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
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
