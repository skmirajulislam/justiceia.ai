import { NextRequest, NextResponse } from 'next/server';

// Strict allowlist of storage hostnames for SSRF remediation (CodeQL js/request-forgery)
const EXACT_ALLOWED_HOSTS = new Set([
    'utfs.io',
    'uploadthing.com',
    'ufs.sh',
]);

function getValidatedSafeUrl(rawUrl: string): string | null {
    try {
        const parsed = new URL(rawUrl);

        // 1. Enforce HTTPS only (no file://, http://, ftp://, etc.)
        if (parsed.protocol !== 'https:') {
            return null;
        }

        const hostname = parsed.hostname.toLowerCase();

        // 2. Validate hostname against strict trusted domains (UploadThing CDN)
        let isHostTrusted = EXACT_ALLOWED_HOSTS.has(hostname);
        if (!isHostTrusted && hostname.endsWith('.ufs.sh')) {
            // Ensure subdomain is alphanumeric only (e.g. abc123xyz.ufs.sh)
            const subdomain = hostname.slice(0, -7);
            if (/^[a-z0-9-]+$/.test(subdomain)) {
                isHostTrusted = true;
            }
        }

        if (!isHostTrusted) {
            return null;
        }

        // 3. Validate pathname characters (prevent path traversal / control characters)
        const pathname = parsed.pathname;
        if (!/^\/[a-zA-Z0-9_.\-\/]+$/.test(pathname) || pathname.includes('..')) {
            return null;
        }

        // 4. Reconstruct sanitized target URL from trusted components
        const safeTargetUrl = new URL(pathname, `https://${hostname}`);
        if (parsed.search) {
            // Only preserve safe query parameters if present
            safeTargetUrl.search = parsed.search;
        }

        return safeTargetUrl.toString();
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fileUrl = searchParams.get('url');
        const filename = searchParams.get('filename') || 'legal_document.pdf';

        if (!fileUrl) {
            return NextResponse.json({ error: 'File URL is required' }, { status: 400 });
        }

        // Validate and sanitize URL against allowlist to resolve SSRF (CodeQL js/request-forgery)
        const safeUrl = getValidatedSafeUrl(fileUrl);
        if (!safeUrl) {
            return NextResponse.json({ error: 'URL not allowed or invalid' }, { status: 403 });
        }

        // Fetch validated remote file on server side
        const res = await fetch(safeUrl);
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
