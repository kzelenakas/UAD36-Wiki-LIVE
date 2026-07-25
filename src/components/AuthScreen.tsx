import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Mail, User, AlertCircle, KeyRound } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Email address is required.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoUser = (type: 'staff' | 'admin') => {
    if (type === 'admin') {
      setEmail('kevin.zelenakas@truefootage.tech');
      setDisplayName('Kevin Zelenakas');
    } else {
      setEmail('appraiser.field@truefootage.tech');
      setDisplayName('Marcus Ramirez');
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Login Restricted</h3>
                    <div className="mt-2 text-xs text-red-700 leading-relaxed">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Workspace Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@truefootage.tech"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Must belong to authorized Google Workspace domain.
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Full Name (Optional)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Jane Doe"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 bg-slate-50/50"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 transition-all duration-150 cursor-pointer"
              >
                {isLoading ? "Signing in via SSO..." : "Sign in with Google Workspace"}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="text-center">
              <span className="px-2 bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
                On-Click Demonstration Presets
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setDemoUser('staff')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <User className="h-4 w-4 text-emerald-700" />
                Staff Appraiser
              </button>
              <button
                onClick={() => setDemoUser('admin')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <KeyRound className="h-4 w-4 text-amber-700" />
                Quality Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
