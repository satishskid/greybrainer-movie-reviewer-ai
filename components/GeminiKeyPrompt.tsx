import React, { useState } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { storeGeminiApiKey, updateGeminiKeyValidation, isValidGeminiKeyFormat } from '../utils/geminiKeyStorage';

interface GeminiKeyPromptProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  onSkip?: () => void;
  isValidating?: boolean;
  error?: string | null;
}

export const GeminiKeyPrompt: React.FC<GeminiKeyPromptProps> = ({
  isOpen,
  onSubmit,
  onSkip,
  isValidating = false,
  error = null,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      try {
        // Basic format validation
        const isValidFormat = isValidGeminiKeyFormat(apiKey.trim());
        
        // Store the API key
        storeGeminiApiKey(apiKey.trim(), isValidFormat);
        
        // Update validation status
        updateGeminiKeyValidation(isValidFormat);
        
        // Call the parent's onSubmit callback
        onSubmit(apiKey.trim());
      } catch (error) {
        console.error('Error storing API key:', error);
        // Still call onSubmit to allow the user to proceed
        onSubmit(apiKey.trim());
      }
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l6.414-6.414A6 6 0 0119 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Gemini API Key Required</h2>
          </div>

          <div className="mb-4 p-3 bg-blue-900/40 border border-blue-700/60 rounded-md text-blue-200 text-sm">
            <div className="flex items-start">
              <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-blue-400" />
              <div>
                <p className="mb-2">
                  <strong>Why do you need this?</strong> To provide accurate movie analysis and avoid hallucinations, this app uses Google's Gemini AI.
                </p>
                <p className="mb-2">
                  <strong>How to get your key:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Google AI Studio</a></li>
                  <li>Sign in with your Google account</li>
                  <li>Click "Create API Key"</li>
                  <li>Copy and paste it below</li>
                </ol>
                <p className="mt-2 text-xs text-blue-300">
                  <strong>Privacy:</strong> Your API key is stored locally in your browser and never sent to our servers.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="geminiApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  id="geminiApiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..." 
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-slate-100 placeholder-slate-400 pr-12"
                  required
                  disabled={isValidating}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  disabled={isValidating}
                >
                  {showKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-700/30 text-red-300 border border-red-600 rounded-md text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!apiKey.trim() || isValidating}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isValidating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Validating...</span>
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
              
              {onSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isValidating}
                  className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium rounded-lg transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Skip for Now
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Free tier: 15 requests per minute, 1500 requests per day.
              <br />
              <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                View Gemini API pricing
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};