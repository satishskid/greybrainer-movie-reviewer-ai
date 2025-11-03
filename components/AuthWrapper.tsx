import React, { useState, useEffect } from 'react';
import { authService as firebaseAuthService, GreybrainerUser } from '../services/firebaseConfig';
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
  const [user, setUser] = useState<GreybrainerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showGeminiKeyPrompt, setShowGeminiKeyPrompt] = useState(false);
  const [showGoogleSearchKeyPrompt, setShowGoogleSearchKeyPrompt] = useState(false);

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged((user: GreybrainerUser | null) => {
      setUser(user);
      setLoading(false);
      
      // Check if user is authenticated but doesn't have API keys
      if (user && !hasGeminiApiKey()) {
        setShowGeminiKeyPrompt(true);
      } else if (user && hasGeminiApiKey() && !hasGoogleSearchApiKey()) {
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
      await firebaseAuthService.signInWithGoogle();
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

          <div className="space-y-6">
            {loginError && (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">{loginError}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 border border-gray-300"
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
          </div>

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
