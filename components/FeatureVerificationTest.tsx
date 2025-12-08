import React, { useState } from 'react';
import { verifyNewFeatures } from '../utils/featureVerification';

export const FeatureVerificationTest: React.FC = () => {
  const [results, setResults] = useState<{
    searchTest: { success: boolean; message: string; data?: any };
    pixarParsingTest: { success: boolean; message: string; data?: any };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runVerification = async () => {
    setIsLoading(true);
    try {
      const verificationResults = await verifyNewFeatures();
      setResults(verificationResults);
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-100">Feature Verification</h3>
        <button
          onClick={runVerification}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white text-sm rounded transition-colors"
        >
          {isLoading ? 'Running Tests...' : 'Run Verification'}
        </button>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Verifies the new features: Rich Movie Search (Year/Director) and Pixar Scene Parsing logic.
      </p>

      {results && (
        <div className="space-y-4">
          {/* Search Test Result */}
          <div className={`p-4 rounded border ${results.searchTest.success ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
            <h4 className={`font-medium mb-2 ${results.searchTest.success ? 'text-green-300' : 'text-red-300'}`}>
              Movie Search Test
            </h4>
            <p className="text-sm text-slate-300">{results.searchTest.message}</p>
            {results.searchTest.data && (
              <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-slate-400 overflow-x-auto">
                {JSON.stringify(results.searchTest.data, null, 2)}
              </pre>
            )}
          </div>

          {/* Pixar Parsing Test Result */}
          <div className={`p-4 rounded border ${results.pixarParsingTest.success ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
            <h4 className={`font-medium mb-2 ${results.pixarParsingTest.success ? 'text-green-300' : 'text-red-300'}`}>
              Pixar Parsing Test
            </h4>
            <p className="text-sm text-slate-300">{results.pixarParsingTest.message}</p>
            {results.pixarParsingTest.data && (
              <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-slate-400 overflow-x-auto">
                {JSON.stringify(results.pixarParsingTest.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
