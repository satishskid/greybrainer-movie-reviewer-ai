import React, { useState } from 'react';
import { getGeminiApiKeyString, hasGeminiApiKey, isGeminiKeyValidated } from '../utils/geminiKeyStorage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL_TEXT } from '../constants';

const GeminiDebugTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const runDebugTest = async () => {
    setIsLoading(true);
    setTestResult('');
    
    try {
      // Check if API key exists
      const hasKey = hasGeminiApiKey();
      const isValidated = isGeminiKeyValidated();
      const apiKey = getGeminiApiKeyString();
      
      let result = `Debug Test Results:\n`;
      result += `Has API Key: ${hasKey}\n`;
      result += `Is Validated: ${isValidated}\n`;
      result += `API Key Length: ${apiKey ? apiKey.length : 0}\n`;
      result += `API Key Preview: ${apiKey ? apiKey.substring(0, 10) + '...' : 'None'}\n\n`;
      
      if (!apiKey) {
        result += 'ERROR: No API key found!';
        setTestResult(result);
        return;
      }
      
      // Test simple API call
      result += 'Testing Gemini API call...\n';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_TEXT });
      
      const response = await model.generateContent('Say "Hello, this is a test response from Gemini API" and nothing else.');
      
      const responseText = response.response.text().trim();
      result += `API Response: ${responseText}\n`;
      result += 'SUCCESS: Gemini API is working correctly!';
      
    } catch (error) {
      let result = `Debug Test Results:\n`;
      result += `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      result += 'This might explain the "hallucination" issue.';
      setTestResult(result);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Gemini API Debug Test</h3>
      <button
        onClick={runDebugTest}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {isLoading ? 'Testing...' : 'Run Debug Test'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-3 bg-white border rounded">
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}
    </div>
  );
};

export default GeminiDebugTest;