import React, { useState } from 'react';
import { ApiStatusChecker } from './ApiStatusChecker';

interface ApiStatusIndicatorProps {
  className?: string;
}

export const ApiStatusIndicator: React.FC<ApiStatusIndicatorProps> = ({ className = '' }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'testing' | 'success' | 'error'>('unknown');

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'testing':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'success':
        return 'APIs Ready';
      case 'error':
        return 'API Issues';
      case 'testing':
        return 'Testing APIs';
      default:
        return 'API Status';
    }
  };

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:opacity-80 ${className}`}
        style={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-slate-300">{getStatusText()}</span>
      </button>

      {/* Modal overlay for detailed API status */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-100">API Status Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <ApiStatusChecker 
                onStatusChange={setApiStatus}
                isModal={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
