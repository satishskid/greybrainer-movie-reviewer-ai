import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { braveSearchService } from '../services/braveSearchService';

interface BraveSearchKeyManagerProps {
  className?: string;
}

export const BraveSearchKeyManager: React.FC<BraveSearchKeyManagerProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'working' | 'failed'>('unknown');

  useEffect(() => {
    checkStoredKey();
  }, []);

  const checkStoredKey = () => {
    const storedKey = braveSearchService.getApiKey();
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
      braveSearchService.setApiKey(apiKey.trim());
      setMessage({ type: 'success', text: 'Brave Search API key saved successfully!' });
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

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key first' });
      return;
    }

    setIsTestingConnection(true);
    setMessage(null);

    try {
      // Temporarily set the key for testing
      const originalKey = braveSearchService.getApiKey();
      braveSearchService.setApiKey(apiKey.trim());
      
      const isWorking = await braveSearchService.testConnection();
      
      if (isWorking) {
        setConnectionStatus('working');
        setMessage({ type: 'success', text: 'Connection test successful!' });
      } else {
        setConnectionStatus('failed');
        setMessage({ type: 'error', text: 'Connection test failed. Please check your API key.' });
        // Restore original key if test failed
        if (originalKey) {
          braveSearchService.setApiKey(originalKey);
        }
      }
    } catch (error) {
      setConnectionStatus('failed');
      setMessage({ type: 'error', text: 'Connection test failed. Please check your API key.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem('brave_api_key');
    setApiKey('');
    setHasStoredKey(false);
    setConnectionStatus('unknown');
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
        <span>Brave Search API</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          hasStoredKey 
            ? (connectionStatus === 'working' ? 'bg-green-900/50 text-green-300' : 
               connectionStatus === 'failed' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300')
            : 'bg-red-900/50 text-red-300'
        }`}>
          {hasStoredKey ? 
            (connectionStatus === 'working' ? 'Working' : 
             connectionStatus === 'failed' ? 'Failed' : 'Untested') 
            : 'Missing'}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Manage Brave Search API Key</h2>
                <p className="text-sm text-slate-400">Configure your Brave Search API for movie suggestions</p>
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
                  {hasStoredKey && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      connectionStatus === 'working' ? 'bg-green-900/50 text-green-300' : 
                      connectionStatus === 'failed' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {connectionStatus === 'working' ? 'Working' : 
                       connectionStatus === 'failed' ? 'Failed' : 'Untested'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="braveApiKey" className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    id="braveApiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-12"
                    placeholder="Enter your Brave Search API key"
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
                    <p className="mb-1">Get your API key from Brave Search API:</p>
                    <a 
                      href="https://api.search.brave.com/app/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      https://api.search.brave.com/app/keys
                    </a>
                    <p className="mt-2 text-slate-400">
                      This key enables movie search suggestions and discovery features.
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
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !apiKey.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !apiKey.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
              </div>

              <div className="flex space-x-3">
                {hasStoredKey && (
                  <button
                    onClick={handleRemove}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    Remove Key
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BraveSearchKeyManager;