import { NextRequest, NextResponse } from 'next/server';

function base64UrlDecode(str: string): Uint8Array {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function verifyJwtInEdge(token: string, secret: string): Promise<boolean> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const [headerB64, payloadB64, signatureB64] = parts;
        const payloadJson = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

        // Check expiration
        if (payloadJson.exp && Date.now() >= payloadJson.exp * 1000) {
            return false;
        }

        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const data = enc.encode(`${headerB64}.${payloadB64}`);
        const signature = base64UrlDecode(signatureB64);

        return await crypto.subtle.verify('HMAC', key, signature, data);
    } catch (e) {
        console.warn('Edge JWT verification error:', e);
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth-token')?.value;

    // Allow all API routes, static files, and Next.js internals
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Public routes
    const publicPaths = ['/', '/auth'];
    const isPublicPath = publicPaths.includes(pathname);

    // Protected routes that require authentication
    const protectedPrefixes = [
        '/chatbot',
        '/library',
        '/consult',
        '/document-processor',
        '/publish-report',
        '/profile',
        '/vkyc',
    ];
    const isProtectedPath = protectedPrefixes.some((prefix) =>
        pathname.startsWith(prefix)
    );

    // If accessing protected route without a token, redirect to /auth
    if (!token && isProtectedPath) {
        return NextResponse.redirect(new URL('/auth', request.url));
    }

    // If token is present on protected route, verify it in Edge
    if (token && isProtectedPath) {
        const secret = process.env.JWT_SECRET;
        if (secret) {
            const isValid = await verifyJwtInEdge(token, secret);
            if (!isValid) {
                console.log(`Invalid or expired token for ${pathname}, redirecting to /auth`);
                const response = NextResponse.redirect(new URL('/auth', request.url));
                response.cookies.delete('auth-token');
                return response;
            }
        }
    }

    // If user is already authenticated and visits /auth, redirect to /profile or /consult
    if (token && isPublicPath && pathname === '/auth') {
        const secret = process.env.JWT_SECRET;
        if (secret) {
            const isValid = await verifyJwtInEdge(token, secret);
            if (isValid) {
                return NextResponse.redirect(new URL('/consult', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};