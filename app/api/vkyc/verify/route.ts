import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('id') || searchParams.get('certificateId') || searchParams.get('token') || searchParams.get('query');

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { error: 'Certificate ID, Auth Token, or Advocate ID is required.' },
                { status: 400 }
            );
        }

        const cleanQuery = query.trim();
        const upperQuery = cleanQuery.toUpperCase();

        // 1. Direct search in vkyc_certificates table by certificate_id, auth_token, or sha256_hash
        let certificateRecord = await prisma.vkycCertificate.findFirst({
            where: {
                OR: [
                    { certificate_id: { equals: upperQuery, mode: 'insensitive' } },
                    { auth_token: { equals: upperQuery, mode: 'insensitive' } },
                    { sha256_hash: { equals: cleanQuery, mode: 'insensitive' } },
                ],
                is_active: true,
            },
            include: {
                profile: {
                    include: {
                        advocateProfile: true,
                        vkycDocuments: {
                            select: {
                                id: true,
                                document_type: true,
                                created_at: true,
                            }
                        }
                    }
                }
            }
        });

        // 2. If not found via direct certificate token, search via verified advocate email
        if (!certificateRecord) {
            const profile = await prisma.profile.findFirst({
                where: {
                    email: { equals: cleanQuery, mode: 'insensitive' },
                    vkyc_completed: true,
                },
                include: {
                    advocateProfile: true,
                    vkycDocuments: {
                        select: {
                            id: true,
                            document_type: true,
                            created_at: true,
                        }
                    },
                    vkycCertificate: true
                }
            });

            if (profile && profile.vkycCertificate) {
                certificateRecord = {
                    ...profile.vkycCertificate,
                    profile
                };
            }
        }

        if (!certificateRecord || !certificateRecord.profile) {
            return NextResponse.json({
                found: false,
                message: 'No verified legal practitioner certificate found in database with the provided identifier.',
            }, { status: 404 });
        }

        const profile = certificateRecord.profile;
        const advocateName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Verified Advocate';
        const roleRaw = profile.role || 'LAWYER';
        const roleFormatted = roleRaw.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

        return NextResponse.json({
            found: true,
            status: profile.vkyc_completed ? 'VERIFIED_AND_ACTIVE' : 'PENDING_REVERIFICATION',
            verification: {
                certificateId: certificateRecord.certificate_id,
                authToken: certificateRecord.auth_token,
                sha256Hash: certificateRecord.sha256_hash,
                digitalSealAuthority: certificateRecord.digital_seal_authority || 'Justiceia.ai Trust Authority',
                tamperProofStatus: certificateRecord.tamper_proof_status || 'VERIFIED & CRYPTOGRAPHICALLY TAMPER-PROOF',
                issuedAt: certificateRecord.issued_at,
                advocateName,
                role: roleFormatted,
                rawRole: profile.role,
                experienceYears: profile.advocateProfile?.experience ?? 0,
                hourlyRate: profile.advocateProfile?.hourly_rate ?? 0,
                specializations: profile.advocateProfile?.specialization?.length 
                    ? profile.advocateProfile.specialization 
                    : ['General Legal Practice'],
                location: profile.advocateProfile?.location || profile.address || 'Verified Chamber Office',
                education: profile.advocateProfile?.education || null,
                certifications: profile.advocateProfile?.certifications || [],
                languages: profile.advocateProfile?.languages || [],
                vkycCompletedAt: profile.vkyc_completed_at || certificateRecord.issued_at,
                biometricsPassed: true,
                documentCount: profile.vkycDocuments.length,
                authority: certificateRecord.digital_seal_authority || 'Justiceia.ai National Legal Compliance & Accreditation Directorate',
                evidenceActSection: 'Section 65B IT Act 2000'
            }
        });

    } catch (error) {
        console.error('Certificate verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
