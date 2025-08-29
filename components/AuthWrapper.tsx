import React, { useState, useEffect } from 'react';
import { authService, User, AuthState } from '../src/services/authService';
import { LoadingSpinner } from './LoadingSpinner';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { KeyIcon } from './icons/KeyIcon';
import { GeminiKeyPrompt } from './GeminiKeyPrompt';
import { GeminiKeyManager } from './GeminiKeyManager';
import GeminiDebugTest from './GeminiDebugTest';
import { hasGeminiApiKey } from '../utils/geminiKeyStorage';
import { hasGoogleSearchApiKey } from '../utils/googleSearchKeyStorage';
import { GoogleSearchKeyPrompt } from './GoogleSearchKeyPrompt';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showGeminiKeyPrompt, setShowGeminiKeyPrompt] = useState(false);
  const [showGoogleSearchKeyPrompt, setShowGoogleSearchKeyPrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((authState: AuthState) => {
      setUser(authState.user);
      setLoading(false);
      
      // Check if user is authenticated but doesn't have API keys
      if (authState.user && !hasGeminiApiKey()) {
        setShowGeminiKeyPrompt(true);
      } else if (authState.user && hasGeminiApiKey() && !hasGoogleSearchApiKey()) {
        setShowGoogleSearchKeyPrompt(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      await authService.signIn(email, password);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-slate-300 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
              <LockClosedIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Greybrainer AI</h1>
            <p className="text-slate-400">Movie Reviewer Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {loginError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <KeyIcon className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Access is restricted to authorized users only.
              <br />
              Contact administrator for access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleGeminiKeySubmit = (apiKey: string) => {
    // The key storage is handled inside the GeminiKeyPrompt component
    setShowGeminiKeyPrompt(false);
    // After Gemini key is set, check for Google Search key
    if (!hasGoogleSearchApiKey()) {
      setShowGoogleSearchKeyPrompt(true);
    }
  };

  const handleGeminiKeySkip = () => {
    setShowGeminiKeyPrompt(false);
    // After skipping Gemini key, still check for Google Search key
    if (!hasGoogleSearchApiKey()) {
      setShowGoogleSearchKeyPrompt(true);
    }
  };

  const handleGoogleSearchKeySubmit = (apiKey: string) => {
    // The key storage is handled inside the GoogleSearchKeyPrompt component
    setShowGoogleSearchKeyPrompt(false);
  };

  const handleGoogleSearchKeySkip = () => {
    setShowGoogleSearchKeyPrompt(false);
  };

  // Show Gemini key prompt if user is authenticated but no API key is stored
  if (user && showGeminiKeyPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <GeminiKeyPrompt 
          isOpen={true}
          onSubmit={handleGeminiKeySubmit}
          onSkip={handleGeminiKeySkip}
        />
      </div>
    );
  }

  // Show Google Search key prompt after Gemini key is configured
  if (user && showGoogleSearchKeyPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <GoogleSearchKeyPrompt 
          isOpen={true}
          onSubmit={handleGoogleSearchKeySubmit}
          onSkip={handleGoogleSearchKeySkip}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* User Info Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-300 text-sm font-medium">
                {user.name}
              </span>
              <span className="text-slate-400 text-xs">
                {user.role} • {user.department}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <GeminiKeyManager />
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Debug Section */}
      <div className="max-w-7xl mx-auto p-4">
        <GeminiDebugTest />
      </div>

      {/* Main App Content */}
      {children}
    </div>
  );
  };
