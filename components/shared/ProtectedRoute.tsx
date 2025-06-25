"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVKYC?: boolean;
}

const ProtectedRoute = ({ children, requireVKYC = false }: ProtectedRouteProps) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to finish loading
      if (loading) return;

      // If no session, middleware should handle redirect
      if (!session) {
        setIsChecking(false);
        return;
      }

      // If VKYC is required, check completion
      if (requireVKYC) {
        try {
          const response = await fetch(`/api/profile/${session.user.id}`);
          if (response.ok) {
            const profile = await response.json();
            if (!profile?.vkyc_completed) {
              router.push('/vkyc');
              return;
            }
          }
        } catch (error) {
          console.error('VKYC check error:', error);
          return;
        }
      }

      // All checks passed
      setHasAccess(true);
      setIsChecking(false);
    };

    checkAccess();
  }, [session, loading, router, requireVKYC]);

  // Show loading while checking
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // If no session, don't render (middleware will redirect)
  if (!session) {
    return null;
  }

  // If checking access, don't render yet
  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;