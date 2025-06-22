'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

// Define props interface
interface AuthFormProps {
  onSignIn: () => Promise<void>;
  onSignUp: () => Promise<void>;
  isLoading: boolean;
}

const AuthForm = ({ onSignIn, onSignUp, isLoading }: AuthFormProps) => {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignIn) {
      await onSignIn();
    } else {
      await onSignUp();
    }
  };

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
      <div className="flex mb-6 border rounded-lg overflow-hidden">
        <button
          className={`flex-1 py-2 ${isSignIn ? 'bg-sky-500 text-white' : 'bg-white text-slate-600'}`}
          onClick={() => setIsSignIn(true)}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-2 ${!isSignIn ? 'bg-sky-500 text-white' : 'bg-white text-slate-600'}`}
          onClick={() => setIsSignIn(false)}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {!isSignIn && (
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isSignIn}
              placeholder="Enter your full name"
              className="border-slate-300"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            className="border-slate-300"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="border-slate-300"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isSignIn ? 'Signing in...' : 'Signing up...'}
            </>
          ) : (
            <>{isSignIn ? 'Sign In' : 'Sign Up'}</>
          )}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-slate-600">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}
        <button
          onClick={() => setIsSignIn(!isSignIn)}
          className="ml-1 text-sky-600 hover:text-sky-800 font-medium"
        >
          {isSignIn ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
};

export default AuthForm;