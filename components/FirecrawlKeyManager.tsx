import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { setFirecrawlApiKey, getFirecrawlApiKey, removeFirecrawlApiKey } from '../utils/firecrawlKeyStorage';

interface FirecrawlKeyManagerProps {
  className?: string;
}

export const FirecrawlKeyManager: React.FC<FirecrawlKeyManagerProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    checkStoredKey();
  }, []);

  const checkStoredKey = () => {
    const storedKey = getFirecrawlApiKey();
    if (storedKey) {
      setHasStoredKey(true);
      setApiKey(storedKey);
    } else {
      setHasStoredKey(false);
      setApiKey('');
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      setFirecrawlApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'Firecrawl API key saved successfully!' });
      checkStoredKey();
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = () => {
    removeFirecrawlApiKey();
    setApiKey('');
    setHasStoredKey(false);
    setMessage({ type: 'info', text: 'API key removed successfully' });
    
    setTimeout(() => {
      setMessage(null);
    }, 2000);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setMessage(null);
    checkStoredKey(); // Reset to stored values
  };

  const maskedKey = hasStoredKey && apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set';

  return (
    <div className={className}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors duration-200"
      >
        <KeyIcon className="w-4 h-4" />
        <span>Firecrawl API</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          hasStoredKey ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
        }`}>
          {hasStoredKey ? 'Set' : 'Missing'}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Manage Firecrawl API Key</h2>
                <p className="text-sm text-slate-400">Configure Firecrawl for competitive intelligence</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Key Status
                </label>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-slate-400">Key:</span>
                  <span className="text-slate-200 font-mono">{maskedKey}</span>
                </div>
              </div>

              <div>
                <label htmlFor="firecrawlApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    id="firecrawlApiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                    placeholder="Enter your Firecrawl API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-slate-300">
                    <p className="mb-1">Get your API key from Firecrawl:</p>
                    <a 
                      href="https://www.firecrawl.dev/app/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      https://www.firecrawl.dev/app/api-keys
                    </a>
                    <p className="mt-2 text-slate-400">
                      This key enables deep web scraping for trend intelligence and competitive research.
                    </p>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700' :
                  message.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-700' :
                  'bg-blue-900/50 text-blue-300 border border-blue-700'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                {hasStoredKey && (
                  <button
                    onClick={handleRemove}
                    className="flex-1 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm font-medium rounded-lg border border-red-900/50 transition-colors duration-200"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving || !apiKey.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
