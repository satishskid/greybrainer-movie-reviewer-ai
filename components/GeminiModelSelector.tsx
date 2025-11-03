import React, { useState, useEffect } from 'react';
import { 
  AVAILABLE_GEMINI_MODELS, 
  getSelectedGeminiModel, 
  setSelectedGeminiModel, 
  testGeminiModel, 
  futureProofModelSetup,
  checkForNewerModels,
  GeminiModelOption 
} from '../utils/geminiModelStorage';
import { getGeminiApiKeyString } from '../utils/geminiKeyStorage';
import { LoadingSpinner } from './LoadingSpinner';

interface GeminiModelSelectorProps {
  onModelChange?: (modelId: string) => void;
}

export const GeminiModelSelector: React.FC<GeminiModelSelectorProps> = ({ onModelChange }) => {
  const [selectedModel, setSelectedModel] = useState<string>(getSelectedGeminiModel());
  const [isTestingModel, setIsTestingModel] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [newerModelsAvailable, setNewerModelsAvailable] = useState<string[]>([]);

  const handleModelChange = (modelId: string) => {
    try {
      setSelectedGeminiModel(modelId);
      setSelectedModel(modelId);
      onModelChange?.(modelId);
    } catch (error) {
      console.error('Error changing model:', error);
    }
  };

  const testCurrentModel = async () => {
    const apiKey = getGeminiApiKeyString();
    if (!apiKey) {
      alert('Please set your Gemini API key first');
      return;
    }

    setIsTestingModel(true);
    try {
      const works = await testGeminiModel(apiKey, selectedModel);
      setTestResults(prev => ({ ...prev, [selectedModel]: works }));
      
      if (works) {
        alert('✅ Model is working correctly!');
      } else {
        alert('❌ Model test failed. Try a different model or check your API key.');
      }
    } catch (error) {
      console.error('Model test error:', error);
      alert('❌ Model test failed. Check console for details.');
    } finally {
      setIsTestingModel(false);
    }
  };

  const autoSetupModel = async () => {
    const apiKey = getGeminiApiKeyString();
    if (!apiKey) {
      alert('Please set your Gemini API key first');
      return;
    }

    setIsAutoDetecting(true);
    try {
      // Use future-proof setup that adapts to new models
      const workingModel = await futureProofModelSetup(apiKey);
      if (workingModel) {
        handleModelChange(workingModel);
        const modelName = AVAILABLE_GEMINI_MODELS.find(m => m.id === workingModel)?.name || workingModel;
        alert(`🎬 Greybrainer configured with: ${modelName}\n\nThis model is optimized for film analysis!`);
        
        // Check for newer models in background
        checkForNewerModels(apiKey).then(({newModels}) => {
          if (newModels.length > 0) {
            setNewerModelsAvailable(newModels);
          }
        });
      } else {
        alert('❌ No compatible models found. Please check your API key and try again.');
      }
    } catch (error) {
      console.error('Auto-setup error:', error);
      alert('❌ Auto-setup failed. Check console for details.');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const getModelStatusIcon = (model: GeminiModelOption) => {
    const testResult = testResults[model.id];
    if (testResult === true) return '✅';
    if (testResult === false) return '❌';
    if (model.isRecommended) return '⭐';
    if (model.isDeprecated) return '⚠️';
    return '';
  };

  // Filter models for simple vs advanced view
  const recommendedModels = AVAILABLE_GEMINI_MODELS.filter(m => !m.isDeprecated);
  const displayModels = showAdvanced ? AVAILABLE_GEMINI_MODELS : recommendedModels;

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">AI Model for Film Analysis</h3>
          <p className="text-sm text-slate-400">Greybrainer uses advanced AI models optimized for cinema evaluation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={autoSetupModel}
            disabled={isAutoDetecting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white text-sm rounded transition-colors flex items-center gap-2 font-medium"
          >
            {isAutoDetecting ? <LoadingSpinner size="sm" /> : '🎬'}
            {isAutoDetecting ? 'Setting up...' : 'Auto-Setup'}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {displayModels.map((model) => (
          <label
            key={model.id}
            className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedModel === model.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
            } ${model.isDeprecated ? 'opacity-60' : ''}`}
          >
            <input
              type="radio"
              name="geminiModel"
              value={model.id}
              checked={selectedModel === model.id}
              onChange={() => handleModelChange(model.id)}
              className="sr-only"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">
                  {model.name}
                </span>
                <span className="text-lg">{getModelStatusIcon(model)}</span>
                {model.isRecommended && (
                  <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                    Recommended
                  </span>
                )}
                {model.isDeprecated && (
                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                    Deprecated
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">{model.description}</p>
              <p className="text-xs text-slate-500 mt-1">Model ID: {model.id}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Legend:</h4>
        <div className="text-xs text-slate-400 space-y-1">
          <div>⭐ Recommended model</div>
          <div>✅ Tested and working</div>
          <div>❌ Tested and failed</div>
          <div>⚠️ Deprecated (may stop working)</div>
        </div>
      </div>

      {newerModelsAvailable.length > 0 && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
          <p className="text-sm text-green-200">
            <strong>🆕 New Models Available:</strong> Google has released newer AI models! 
            Click "Auto-Setup" again to upgrade to the latest models for better film analysis.
          </p>
          <p className="text-xs text-green-300 mt-1">
            New models: {newerModelsAvailable.slice(0, 3).join(', ')}
            {newerModelsAvailable.length > 3 && ` and ${newerModelsAvailable.length - 3} more`}
          </p>
        </div>
      )}

      <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-700/50 rounded-lg">
        <p className="text-sm text-indigo-200">
          <strong>🎬 For Film Professionals:</strong> Click "Auto-Setup" to automatically configure the best AI model for film analysis. 
          Greybrainer will test and select the optimal model for detailed narrative evaluation, character analysis, and cinematic assessment.
        </p>
      </div>

      {showAdvanced && (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-slate-200">Advanced Options</h4>
            <button
              onClick={testCurrentModel}
              disabled={isTestingModel}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs rounded transition-colors flex items-center gap-1"
            >
              {isTestingModel ? <LoadingSpinner size="sm" /> : null}
              Test Current
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Manual model selection for technical users. Most film professionals should use Auto-Setup.
          </p>
        </div>
      )}
    </div>
  );
};