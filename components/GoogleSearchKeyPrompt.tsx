import React, { useState } from 'react';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { googleSearchService, GoogleSearchService } from '../services/googleSearchService';

interface GoogleSearchKeyPromptProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  onSkip?: () => void;
  isValidating?: boolean;
  error?: string | null;
}

export const GoogleSearchKeyPrompt: React.FC<GoogleSearchKeyPromptProps> = ({
  isOpen,
  onSubmit,
  onSkip,
  isValidating = false,
  error = null,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setIsTestingKey(true);
      setTestResult(null);

      try {
        // Store the API key
        GoogleSearchService.setApiKey(apiKey.trim());
        
        // Test the API key
        const isValid = await googleSearchService.testApiKey();
        
        if (isValid) {
          setTestResult('success');
          // Call the parent's onSubmit callback
          onSubmit(apiKey.trim());
        } else {
          setTestResult('error');
          GoogleSearchService.removeApiKey();
        }
      } catch (error) {
        console.error('Error testing Google Search API key:', error);
        setTestResult('error');
        GoogleSearchService.removeApiKey();
      } finally {
        setIsTestingKey(false);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">
              Google Search API Key Required
            </h2>
            <p className="text-slate-400 text-sm">
              To enable movie search suggestions, please provide your Google Custom Search API key.
            </p>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-2">
                  <strong>How to get your key:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Visit <a href="https://console.developers.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Google Cloud Console</a></li>
                  <li>Enable the "Custom Search API"</li>
                  <li>Create credentials (API Key)</li>
                  <li>Set up a Custom Search Engine at <a href="https://cse.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:text-blue-200 underline">Google CSE</a></li>
                  <li>Configure it to search movie sites (IMDb, Rotten Tomatoes, etc.)</li>
                </ol>
                <p className="mt-2 text-xs text-blue-300">
                  <strong>Privacy:</strong> Your API key is stored locally in your browser and never sent to our servers.
                </p>
                <p className="mt-1 text-xs text-blue-300">
                  <strong>Free tier:</strong> 100 searches per day
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="googleSearchApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                Google Custom Search API Key
              </label>
              <div className="relative">
                <input
                  id="googleSearchApiKey"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Google Custom Search API key"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-20"
                  disabled={isTestingKey || isValidating}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 text-sm"
                  disabled={isTestingKey || isValidating}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {(error || testResult === 'error') && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  {error || 'API key test failed. Please check your key and try again.'}
                </p>
              </div>
            )}

            {testResult === 'success' && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                <p className="text-green-300 text-sm">
                  ✓ API key is valid! Movie search suggestions are now enabled.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={!apiKey.trim() || isTestingKey || isValidating}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isTestingKey || isValidating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Testing...</span>
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
              
              {onSkip && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isTestingKey || isValidating}
                  className="px-4 py-3 bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium rounded-lg transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Skip for Now
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-xs text-slate-400 text-center">
              Without this key, you'll need to type movie titles manually.
              <br />
              <a href="https://developers.google.com/custom-search/v1/overview" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Learn more about Google Custom Search API
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};