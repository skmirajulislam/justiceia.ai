'use client';

import { useState } from 'react';
import AuthForm from '@/components/AuthForm';
import Navbar from '@/components/Navbar';

const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (data: any) => {
    setIsLoading(true);
    // TODO: Implement sign-in logic
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleSignUp = async (data: any) => {
    setIsLoading(true);
    // TODO: Implement sign-up logic
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center text-slate-900">Welcome to Legal India</h1>
          <AuthForm onSignIn={handleSignIn} onSignUp={handleSignUp} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default AuthPage;