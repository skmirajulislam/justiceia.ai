'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireVKYC?: boolean;
}

const ProtectedRoute = ({ children, requireVKYC = false }: ProtectedRouteProps) => {
    const { session, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!session) {
            router.replace('/auth');
            return;
        }

        // Only enforce VKYC for advocates/professionals
        if (requireVKYC && session.user.isProfessional && !session.user.vkyc_completed) {
            router.replace('/vkyc');
        }
    }, [session, loading, router, requireVKYC]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        return null;
    }

    if (requireVKYC && session.user.isProfessional && !session.user.vkyc_completed) {
        return null;
    }

    return (
        <div className="animate-in fade-in duration-200 w-full">
            {children}
        </div>
    );
};

export default ProtectedRoute;