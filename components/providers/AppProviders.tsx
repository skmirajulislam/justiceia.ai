'use client';

import ClientProviders from './ClientProviders';
import { AuthProvider } from '@/hooks/useAuth';

export default function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ClientProviders>
                {children}
            </ClientProviders>
        </AuthProvider>
    );
}