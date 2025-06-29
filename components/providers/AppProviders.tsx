'use client';

import { SessionProvider } from 'next-auth/react';
import ClientProviders from './ClientProviders';
import { AuthProvider } from '@/hooks/useAuth';

export default function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthProvider>
                <ClientProviders>
                    {children}
                </ClientProviders>
            </AuthProvider>
        </SessionProvider>
    );
}