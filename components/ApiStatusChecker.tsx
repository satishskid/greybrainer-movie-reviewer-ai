import React, { useState } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface ApiStatus {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
}

export const ApiStatusChecker: React.FC = () => {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([
    { name: 'Gemini', status: 'checking', message: 'Not tested' },
    { name: 'Groq', status: 'checking', message: 'Not tested' },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkApiStatus = async (apiName: string, apiKey: string | undefined, apiUrl: string, model: string) => {
    if (!apiKey) {
      return { status: 'error' as const, message: 'API key not configured' };
    }

    try {
      const requestBody = {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say 'Hello' in one word." }
        ],
        model: model,
        temperature: 0.1,
        max_tokens: 10,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        return { 
          status: 'error' as const, 
          message: `HTTP ${response.status}: ${errorData.error?.message || errorData.message || 'Unknown error'}` 
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      
      if (content) {
        return { status: 'success' as const, message: `✓ Working - Response: "${content}"` };
      } else {
        return { status: 'error' as const, message: 'No response content received' };
      }
    } catch (error) {
      return { 
        status: 'error' as const, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const checkGeminiStatus = async () => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey) {
      return { status: 'error' as const, message: 'API key not configured' };
    }

    try {
      // Simple test with Gemini API
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models.generateContent;

      const result = await model({
        model: "gemini-1.5-flash",
        contents: [{ parts: [{ text: "Say 'Hello' in one word." }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 }
      });

      const text = result.text?.trim();
      if (text) {
        return { status: 'success' as const, message: `✓ Working - Response: "${text}"` };
      } else {
        return { status: 'error' as const, message: 'No response content received' };
      }
    } catch (error) {
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const checkAllApis = async () => {
    setIsChecking(true);
    
    const checks = [
      { name: 'Gemini', checker: checkGeminiStatus },
      {
        name: 'Groq',
        checker: () => checkApiStatus(
          'Groq',
          import.meta.env.VITE_GROQ_API_KEY,
          'https://api.groq.com/openai/v1/chat/completions',
          'llama3-8b-8192'
        )
      },
    ];

    for (const check of checks) {
      setApiStatuses(prev => prev.map(api => 
        api.name === check.name 
          ? { ...api, status: 'checking', message: 'Testing...' }
          : api
      ));

      const result = await check.checker();
      
      setApiStatuses(prev => prev.map(api => 
        api.name === check.name 
          ? { ...api, status: result.status, message: result.message }
          : api
      ));
    }

    setIsChecking(false);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">API Status Checker</h3>
        <button
          onClick={checkAllApis}
          disabled={isChecking}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? 'Checking...' : 'Test All APIs'}
        </button>
      </div>

      <div className="mb-4 p-3 bg-slate-700 rounded-lg">
        <p className="text-sm text-slate-300">
          <strong>AI Services:</strong> Testing Gemini (primary) and Groq (fallback) APIs for movie analysis functionality.
        </p>
      </div>
      
      <div className="space-y-3">
        {apiStatuses.map((api) => (
          <div key={api.name} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {api.status === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-500" />}
                {api.status === 'error' && <XMarkIcon className="w-5 h-5 text-red-500" />}
                {api.status === 'checking' && (
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                <span className="font-medium text-slate-100">{api.name}</span>
              </div>
            </div>
            <div className="text-sm text-slate-300 max-w-md text-right">
              {api.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
