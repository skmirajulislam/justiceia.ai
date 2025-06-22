'use client';

import { useState } from 'react';
import AuthForm from '@/components/AuthForm';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Your sign in logic here
      console.log('Signing in with:', email, password);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect after successful login
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // Your sign up logic here
      console.log('Signing up with:', name, email, password);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Redirect after successful registration
      router.push('/dashboard');
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Welcome to Justice IA</h1>
          <p className="text-slate-600 mt-2">Sign in to your account or create a new one</p>
        </div>

        <AuthForm
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}