'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export interface User {
    id: string;
    email: string;
    name?: string;
    first_name?: string | null;
    last_name?: string | null;
    role: string;
    kyc_type?: string;
    avatar_url?: string | null;
    can_upload_reports?: boolean;
    vkyc_completed?: boolean;
    isProfessional?: boolean;
    advocateProfile?: {
        id: string;
        specialization: string[];
        hourly_rate: number;
        is_verified: boolean;
        is_available: boolean;
        image_url?: string | null;
    } | null;
}

export interface Session {
    user: User;
}

interface AuthContextType {
    session: Session | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (data: any) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSession = useCallback(async () => {
        try {
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
            });

            if (!response.ok) {
                setSession(null);
                return;
            }

            const data = await response.json();
            if (data?.session) {
                setSession(data.session);
            } else {
                setSession(null);
            }
        } catch (error) {
            console.error('Session check error:', error);
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            if (!response.ok) {
                return { success: false, error: 'Login request failed' };
            }

            const data = await response.json();

            if (data.session) {
                setSession(data.session);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    const register = async (userData: any) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include',
            });

            if (!response.ok) {
                return { success: false, error: 'Registration request failed' };
            }

            const data = await response.json();

            if (data.session) {
                setSession(data.session);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Registration failed' };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'An unexpected error occurred' };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setSession(null);
        }
    };

    return (
        <AuthContext.Provider value={{ session, loading, login, register, logout, refreshSession: checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}