import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { getGeminiApiKey, storeGeminiApiKey, removeGeminiApiKey, isValidGeminiKeyFormat, updateGeminiKeyValidation } from '../utils/geminiKeyStorage';
import { resetQuotaStatus, getDetailedQuotaInfo } from '../services/geminiService';

interface GeminiKeyManagerProps {
  className?: string;
}

export const GeminiKeyManager: React.FC<GeminiKeyManagerProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<any>(null);

  useEffect(() => {
    checkStoredKey();
    updateQuotaInfo();
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateQuotaInfo();
    }
  }, [isOpen]);

  const updateQuotaInfo = () => {
    const info = getDetailedQuotaInfo();
    console.log('Quota info:', info);
    setQuotaInfo(info);
  };

  const checkStoredKey = () => {
    const keyInfo = getGeminiApiKey();
    if (keyInfo) {
      setHasStoredKey(true);
      setIsValidated(keyInfo.isValidated);
      setApiKey(keyInfo.apiKey);
    } else {
      setHasStoredKey(false);
      setIsValidated(false);
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
      const isValidFormat = isValidGeminiKeyFormat(apiKey.trim());
      storeGeminiApiKey(apiKey.trim(), isValidFormat);
      updateGeminiKeyValidation(isValidFormat);
      
      setMessage({ 
        type: 'success', 
        text: isValidFormat ? 'API key saved successfully!' : 'API key saved (format validation failed)'
      });
      
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
    if (window.confirm('Are you sure you want to remove your stored Gemini API key?')) {
      removeGeminiApiKey();
      setMessage({ type: 'success', text: 'API key removed successfully' });
      checkStoredKey();
      setApiKey('');
      
      setTimeout(() => {
        setMessage(null);
      }, 2000);
    }
  };

  const handleResetQuota = () => {
    if (window.confirm('Are you sure you want to reset the quota status? This will clear the quota exceeded state.')) {
      resetQuotaStatus();
      updateQuotaInfo();
      setMessage({ type: 'success', text: 'Quota status reset successfully' });
      
      setTimeout(() => {
        setMessage(null);
      }, 2000);
    }
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
        <span>Gemini API Key</span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          hasStoredKey 
            ? (isValidated ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300')
            : 'bg-red-900/50 text-red-300'
        }`}>
          {hasStoredKey ? (isValidated ? 'Valid' : 'Unvalidated') : 'Missing'}
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
                <h2 className="text-lg font-semibold text-slate-100">Manage Gemini API Key</h2>
                <p className="text-sm text-slate-400">Update your personal Gemini API key</p>
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
                      isValidated ? 'bg-green-900/50 text-green-300' : 'bg-yellow-900/50 text-yellow-300'
                    }`}>
                      {isValidated ? 'Validated' : 'Unvalidated'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                    placeholder="Enter your Gemini API key"
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
                    <p className="mb-1">Get your API key from Google AI Studio:</p>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      https://aistudio.google.com/app/apikey
                    </a>
                  </div>
                </div>
              </div>

              {/* Debug quota info */}
              {quotaInfo && (
                <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 text-xs">
                  <p className="text-slate-300 mb-1">Debug - Quota Status:</p>
                  <p className="text-slate-400">isExceeded: {quotaInfo.isExceeded ? 'true' : 'false'}</p>
                  {quotaInfo.resetTime && <p className="text-slate-400">Reset time: {quotaInfo.resetTime.toLocaleString()}</p>}
                </div>
              )}

              {quotaInfo?.isExceeded && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="text-xs text-red-300">
                      <p className="font-medium mb-1">⚠️ Quota Exceeded</p>
                      <p>Reset time: {quotaInfo.resetTime?.toLocaleString()}</p>
                      <p>Time remaining: {quotaInfo.timeRemaining?.hours}h {quotaInfo.timeRemaining?.minutes}m {quotaInfo.timeRemaining?.seconds}s</p>
                    </div>
                    <button
                      onClick={handleResetQuota}
                      className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors duration-200"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Manual reset button for testing */}
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-yellow-300">
                    <p className="font-medium">Manual Quota Reset</p>
                    <p>Force reset quota status if stuck</p>
                  </div>
                  <button
                    onClick={handleResetQuota}
                    className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors duration-200"
                  >
                    Force Reset
                  </button>
                </div>
              </div>

              {message && (
                <div className={`rounded-lg p-3 ${
                  message.type === 'success' 
                    ? 'bg-green-900/50 border border-green-700 text-green-300'
                    : 'bg-red-900/50 border border-red-700 text-red-300'
                }`}>
                  <p className="text-sm">{message.text}</p>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
                
                {hasStoredKey && (
                  <button
                    onClick={handleRemove}
                    className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                  >
                    Remove
                  </button>
                )}
                
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors duration-200"
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