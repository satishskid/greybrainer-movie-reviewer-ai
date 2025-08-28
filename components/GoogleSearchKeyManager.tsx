import React, { useState, useEffect } from 'react';
import { googleSearchService, GoogleSearchService } from '../services/googleSearchService';
import { KeyIcon } from './icons/KeyIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface GoogleSearchKeyManagerProps {
  className?: string;
}

export const GoogleSearchKeyManager: React.FC<GoogleSearchKeyManagerProps> = ({ className = '' }) => {
  const [apiKey, setApiKey] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    const storedKey = GoogleSearchService.getStoredApiKey();
    setHasStoredKey(!!storedKey);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setTestResult('error');
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      GoogleSearchService.setApiKey(apiKey.trim());
      const isValid = await googleSearchService.testApiKey();
      
      if (isValid) {
        setTestResult('success');
        setHasStoredKey(true);
        setTimeout(() => {
          setIsExpanded(false);
          setTestResult(null);
        }, 2000);
      } else {
        setTestResult('error');
        GoogleSearchService.removeApiKey();
        setHasStoredKey(false);
      }
    } catch (error) {
      console.error('Error testing Google Search API key:', error);
      setTestResult('error');
      GoogleSearchService.removeApiKey();
      setHasStoredKey(false);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleRemoveKey = () => {
    GoogleSearchService.removeApiKey();
    setApiKey('');
    setHasStoredKey(false);
    setTestResult(null);
  };

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setTestResult(null);
  };

  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      <button
        onClick={handleToggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-750 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-3">
          <KeyIcon className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-medium text-slate-200">
              Google Search API Configuration
            </h3>
            <p className="text-xs text-slate-400">
              {hasStoredKey ? 'API key configured ✓' : 'Required for movie search suggestions'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasStoredKey && (
            <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-700/50">
              Active
            </span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700">
          <div className="mt-4 space-y-4">
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Google Custom Search API Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-200/80">
                    <li>Go to <a href="https://console.developers.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">Google Cloud Console</a></li>
                    <li>Enable the "Custom Search API"</li>
                    <li>Create credentials (API Key)</li>
                    <li>Set up a Custom Search Engine at <a href="https://cse.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">Google CSE</a></li>
                    <li>Configure it to search movie sites (IMDb, Rotten Tomatoes, etc.)</li>
                  </ol>
                  <p className="mt-2 text-xs text-blue-200/60">Free tier: 100 searches/day</p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="google-api-key" className="block text-sm font-medium text-slate-300 mb-2">
                Google Custom Search API Key
              </label>
              <div className="flex space-x-2">
                <input
                  id="google-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Google Custom Search API key"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isTestingKey}
                />
                <button
                  onClick={handleSaveKey}
                  disabled={isTestingKey || !apiKey.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {isTestingKey ? 'Testing...' : 'Save & Test'}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult === 'success' 
                  ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                  : 'bg-red-900/30 border border-red-700/50 text-red-300'
              }`}>
                {testResult === 'success' 
                  ? '✓ API key is valid and working! Movie search suggestions are now enabled.'
                  : '✗ API key test failed. Please check your key and try again.'
                }
              </div>
            )}

            {hasStoredKey && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-xs text-slate-400">
                  API key is stored locally in your browser
                </span>
                <button
                  onClick={handleRemoveKey}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove Key
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleSearchKeyManager;