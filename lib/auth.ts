import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { UserRole, KycType } from '@/app/generated/prisma';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    const user = await prisma.profile.findUnique({
                        where: { email: credentials.email },
                        include: {
                            advocateProfile: true,
                        },
                    });

                    if (!user || !user.password) {
                        return null;
                    }

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordValid) {
                        return null;
                    }

                    const isProfessional = ['BARRISTER', 'LAWYER', 'GOVERNMENT_OFFICIAL'].includes(user.role);

                    return {
                        id: user.id,
                        email: user.email || '',
                        name: `${user.first_name} ${user.last_name}`.trim(),
                        role: user.role,
                        kycType: user.kyc_type,
                        canUploadReports: user.can_upload_reports,
                        isProfessional,
                        advocateProfile: user.advocateProfile ? {
                            id: user.advocateProfile.id,
                            specialization: user.advocateProfile.specialization,
                            hourly_rate: user.advocateProfile.hourly_rate,
                            is_verified: user.advocateProfile.is_verified,
                        } : undefined,
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.kycType = user.kycType;
                token.canUploadReports = user.canUploadReports;
                token.isProfessional = user.isProfessional;
                token.advocateProfile = user.advocateProfile;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.sub!;
                session.user.role = token.role as string;
                session.user.kycType = token.kycType as string;
                session.user.canUploadReports = token.canUploadReports as boolean;
                session.user.isProfessional = token.isProfessional as boolean;
                session.user.advocateProfile = token.advocateProfile;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
    },
};

// Extend NextAuth types
declare module 'next-auth' {
    interface User {
        role: UserRole;
        kycType: KycType;
        canUploadReports: boolean;
        isProfessional: boolean;
        advocateProfile?: {
            id: string;
            specialization: string[];
            hourly_rate: number;
            is_verified: boolean;
        };
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            kycType: string;
            canUploadReports: boolean;
            isProfessional: boolean;
            advocateProfile?: {
                id: string;
                specialization: string[];
                hourly_rate: number;
                is_verified: boolean;
            };
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: UserRole;
        kycType: KycType;
        canUploadReports: boolean;
        isProfessional: boolean;
        advocateProfile?: {
            id: string;
            specialization: string[];
            hourly_rate: number;
            is_verified: boolean;
        };
    }
}
