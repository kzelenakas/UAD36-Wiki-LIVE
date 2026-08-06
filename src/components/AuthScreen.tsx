import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, AlertCircle, LogIn } from 'lucide-react';
import { googleSignIn } from '../lib/authClient';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify the signed-in identity with our server (server checks the Firebase
  // ID token, the Workspace domain, and the admin allowlist) and hydrate the
  // app profile.
  const completeServerLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed');
    onLoginSuccess(data.user);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (!result) throw new Error('Google sign-in was cancelled.');
      await completeServerLogin();
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError(
          'This domain is not yet authorized for Google sign-in. An administrator must add it under Firebase Authentication > Settings > Authorized domains.'
        );
      } else {
        setError(err.message || 'Sign-in failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Dev-only convenience: works ONLY when the server has DEV_AUTH=true.
  const handleDevLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-dev-email': 'kevin.zelenakas@truefootage.tech' },
        body: JSON.stringify({ devEmail: 'kevin.zelenakas@truefootage.tech' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Dev login unavailable (server DEV_AUTH is off).');
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-800 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="h-7 w-7" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-sans font-bold tracking-tight text-slate-900">
          True Footage
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          UAD 3.6 Knowledge Wiki Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Sign-in Notice</h3>
                  <div className="mt-2 text-xs text-red-700 leading-relaxed">{error}</div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-600 mb-6 leading-relaxed text-center">
            Access is restricted to verified <span className="font-semibold">@truefootage.tech</span> Google
            Workspace accounts. Sign in with Google to continue.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 transition-all duration-150 cursor-pointer"
          >
            <LogIn className="h-4.5 w-4.5" />
            {isLoading ? 'Verifying with Google…' : 'Sign in with Google Workspace'}
          </button>

          <p className="mt-4 text-center text-[11px] text-slate-400 leading-relaxed">
            Your identity is verified by Google and your organization. True Footage never sees your password.
          </p>

          {(import.meta as any).env?.DEV && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleDevLogin}
                className="w-full text-[11px] text-slate-400 hover:text-slate-600 font-mono cursor-pointer"
              >
                Dev login (requires server DEV_AUTH=true)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
