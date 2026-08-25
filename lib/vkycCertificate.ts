import prisma from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Generates a cryptographically random, unique Certificate ID and Auth Token.
 * Ensures zero leakage of internal database UUIDs.
 * Checks against database to guarantee uniqueness.
 */
export async function generateUniqueVkycCertificate(userId: string, email?: string | null, issueDate?: Date) {
    const timestamp = issueDate || new Date();
    const year = timestamp.getFullYear();

    let isUnique = false;
    let certificateId = '';
    let authToken = '';

    // Loop to ensure absolute uniqueness in DB
    while (!isUnique) {
        // 12-char hex random token (48 bits of entropy)
        const randomCertBytes = crypto.randomBytes(6).toString('hex').toUpperCase();
        certificateId = `JAI-VKYC-${year}-${randomCertBytes}`;

        // 16-char hex random auth token (64 bits of entropy)
        const randomAuthBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
        authToken = `JAI-AUTH-${randomAuthBytes}`;

        const existing = await prisma.vkycCertificate.findFirst({
            where: {
                OR: [
                    { certificate_id: certificateId },
                    { auth_token: authToken }
                ]
            }
        });

        if (!existing) {
            isUnique = true;
        }
    }

    // Generate secure SHA-256 hash using random tokens + server salt (never expose raw UUID)
    const secretKey = process.env.JWT_SECRET || 'JUSTICEIA_SECURE_SALT_KEY_2026';
    const hashPayload = `${certificateId}:${authToken}:${timestamp.toISOString()}:${email || 'advocate'}`;
    const sha256Hash = crypto.createHmac('sha256', secretKey).update(hashPayload).digest('hex');

    const certificate = await prisma.vkycCertificate.upsert({
        where: { user_id: userId },
        update: {
            certificate_id: certificateId,
            auth_token: authToken,
            sha256_hash: sha256Hash,
            digital_seal_authority: 'Justiceia.ai Trust Authority',
            tamper_proof_status: 'VERIFIED & CRYPTOGRAPHICALLY TAMPER-PROOF',
            is_active: true,
            issued_at: timestamp,
            updated_at: new Date(),
        },
        create: {
            user_id: userId,
            certificate_id: certificateId,
            auth_token: authToken,
            sha256_hash: sha256Hash,
            digital_seal_authority: 'Justiceia.ai Trust Authority',
            tamper_proof_status: 'VERIFIED & CRYPTOGRAPHICALLY TAMPER-PROOF',
            is_active: true,
            issued_at: timestamp,
        }
    });

    return certificate;
}

/**
 * Ensures that a verified user has a valid certificate in the database.
 * If missing, generates and persists one.
 */
export async function getOrCreateVkycCertificate(userId: string, email?: string | null, vkycCompletedAt?: Date | null) {
    let cert = await prisma.vkycCertificate.findUnique({
        where: { user_id: userId }
    });

    if (!cert) {
        cert = await generateUniqueVkycCertificate(userId, email, vkycCompletedAt || new Date());
    }

    return cert;
}
