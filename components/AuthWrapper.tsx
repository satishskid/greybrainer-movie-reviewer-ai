import React, { useState, useEffect } from 'react';
import { authService as firebaseAuthService, GreybrainerUser } from '../services/firebaseConfig';
import { LoadingSpinner } from './LoadingSpinner';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { KeyIcon } from './icons/KeyIcon';
import { GeminiKeyPrompt } from './GeminiKeyPrompt';
import { GeminiKeyManager } from './GeminiKeyManager';
import GeminiDebugTest from './GeminiDebugTest';
import { hasGeminiApiKey } from '../utils/geminiKeyStorage';


interface AuthWrapperProps {
  children: (user: GreybrainerUser | null) => React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<GreybrainerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showGeminiKeyPrompt, setShowGeminiKeyPrompt] = useState(false);
  const sandboxLabel = 'Greybrainer Groq Lab';
  const sandboxSubtitle = 'Experimental publishing sandbox';

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user: GreybrainerUser | null) => {
      setUser(user);
      setLoading(false);
      
      // Check if user is authenticated but doesn't have API keys
      if (user && !hasGeminiApiKey()) {
        setShowGeminiKeyPrompt(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await firebaseAuthService.signInWithGoogle();
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await firebaseAuthService.signInWithEmail(email, password);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseAuthService.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_35%),linear-gradient(135deg,_#160f25_0%,_#111827_45%,_#0b1220_100%)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-purple-200 mt-4">Loading sandbox access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_35%),linear-gradient(135deg,_#160f25_0%,_#111827_45%,_#0b1220_100%)] flex items-center justify-center p-4">
        <div className="bg-slate-900/88 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-lg border border-purple-500/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200 mb-5">
              Sandbox • Not Stable Netlify
            </div>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-fuchsia-950/40">
              <LockClosedIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{sandboxLabel}</h1>
            <p className="text-fuchsia-100/85 font-medium">{sandboxSubtitle}</p>
            <p className="text-slate-400 text-sm mt-3 max-w-sm mx-auto leading-6">
              Separate login surface for Gemini → Groq → Gemini publishing tests. This lab environment is intentionally distinct from the stable Netlify app.
            </p>
          </div>

          <div className="mb-6 grid gap-3 rounded-xl border border-slate-700/70 bg-slate-800/50 p-4 text-sm text-slate-300 md:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-300 mb-1">Branch</div>
              <div className="font-medium text-slate-100">`experiment/gemini-groq-sandbox`</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-300 mb-1">Mode</div>
              <div className="font-medium text-slate-100">Hybrid draft lab</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-fuchsia-300 mb-1">Deploy target</div>
              <div className="font-medium text-slate-100">Cloudflare Pages lab</div>
            </div>
          </div>

          <div className="space-y-6">
            {loginError && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">{loginError}</p>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-3 border border-gray-300 shadow-sm"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 h-px bg-slate-700"></div>
              <span className="text-slate-500 text-sm">or use lab credentials</span>
              <div className="flex-1 h-px bg-slate-700"></div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl transition-colors duration-200"
              >
                {isLoggingIn ? 'Signing In...' : 'Sign In with Email'}
              </button>
            </form>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center leading-5">
              Lab access is restricted to authorized evaluators only.
              <br />
              Stable production remains separate on Netlify.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleGeminiKeySubmit = (_apiKey: string) => {
    setShowGeminiKeyPrompt(false);
  };

  const handleGeminiKeySkip = () => {
    setShowGeminiKeyPrompt(false);
  };

  // Show Gemini key prompt if user is authenticated but no API key is stored
  if (user && showGeminiKeyPrompt) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.24),_transparent_35%),linear-gradient(135deg,_#160f25_0%,_#111827_45%,_#0b1220_100%)]">
        <GeminiKeyPrompt 
          isOpen={true}
          onSubmit={handleGeminiKeySubmit}
          onSkip={handleGeminiKeySkip}
        />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.18),_transparent_30%),linear-gradient(135deg,_#160f25_0%,_#111827_45%,_#0b1220_100%)]">
      {/* User Info Bar */}
      <div className="bg-slate-900/50 border-b border-fuchsia-500/20 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(user.displayName || user.email)?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-300 text-sm font-medium">
                {user.displayName || user.email?.split('@')[0]}
              </span>
              <span className="text-slate-400 text-xs">
                {user.role} • {user.department}
              </span>
            </div>
            <span className="hidden sm:inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200">
              Groq Lab
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Debug Section - Only for development */}
      {import.meta.env.DEV && (
        <div className="max-w-7xl mx-auto p-4">
          <GeminiDebugTest />
        </div>
      )}

      {/* Main App Content */}
      {children(user)}
    </div>
  );
  };
