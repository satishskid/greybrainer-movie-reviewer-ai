import React, { useState, useEffect } from 'react';
import { modelConfigService } from '../services/modelConfigService';
import { getGeminiApiKeyString } from '../utils/geminiKeyStorage';
import { LoadingSpinner } from './LoadingSpinner';

interface ModelHealthStatus {
  modelId: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked?: string;
  error?: string;
}

export const ModelHealthMonitor: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<ModelHealthStatus[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [configSummary, setConfigSummary] = useState<any>(null);

  useEffect(() => {
    loadConfigSummary();
  }, []);

  const loadConfigSummary = () => {
    const summary = modelConfigService.getConfigurationSummary();
    setConfigSummary(summary);
  };

  const checkModelHealth = async () => {
    const apiKey = getGeminiApiKeyString();
    if (!apiKey) {
      alert('Please configure your Gemini API key first');
      return;
    }

    setIsChecking(true);
    const models = modelConfigService.getAvailableModels();
    const healthResults: ModelHealthStatus[] = [];

    for (const model of models) {
      try {
        const result = await modelConfigService.validateModel(apiKey, model.id);
        
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
        if (result.isValid) {
          if (result.responseTime && result.responseTime < 5000) {
            status = 'healthy';
          } else {
            status = 'degraded';
          }
        }

        healthResults.push({
          modelId: model.id,
          name: model.name,
          status,
          responseTime: result.responseTime,
          lastChecked: result.timestamp,
          error: result.error
        });
      } catch (error) {
        healthResults.push({
          modelId: model.id,
          name: model.name,
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date().toISOString()
        });
      }
    }

    setHealthStatus(healthResults);
    setIsChecking(false);
    loadConfigSummary();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <h4 className="text-lg font-medium text-slate-100 mb-3">📊 Model Configuration Summary</h4>
        {configSummary && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Config Version:</span>
              <span className="ml-2 text-slate-200">{configSummary.version}</span>
            </div>
            <div>
              <span className="text-slate-400">Selected Model:</span>
              <span className="ml-2 text-slate-200">{configSummary.selectedModel}</span>
            </div>
            <div>
              <span className="text-slate-400">Available Models:</span>
              <span className="ml-2 text-slate-200">{configSummary.availableModels}</span>
            </div>
            <div>
              <span className="text-slate-400">Discovered Models:</span>
              <span className="ml-2 text-slate-200">{configSummary.discoveredModels}</span>
            </div>
            <div>
              <span className="text-slate-400">Environment Overrides:</span>
              <span className="ml-2 text-slate-200">
                {Object.values(configSummary.environmentOverrides || {}).some(Boolean) ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Last Discovery:</span>
              <span className="ml-2 text-slate-200">
                {configSummary.lastDiscovery ? new Date(configSummary.lastDiscovery).toLocaleDateString() : 'Never'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Health Check Controls */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-slate-100">🏥 Model Health Monitor</h4>
          <button
            onClick={checkModelHealth}
            disabled={isChecking}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm rounded transition-colors flex items-center gap-2"
          >
            {isChecking ? (
              <>
                <LoadingSpinner size="sm" />
                Checking Health...
              </>
            ) : (
              <>
                🔍 Check Model Health
              </>
            )}
          </button>
        </div>

        {/* Health Status Results */}
        {healthStatus.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-md font-medium text-slate-200">Health Status Results:</h5>
            <div className="space-y-2">
              {healthStatus.map((model) => (
                <div key={model.modelId} className="bg-slate-700 rounded p-3 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getStatusIcon(model.status)}</span>
                      <div>
                        <div className="font-medium text-slate-200">{model.name}</div>
                        <div className="text-xs text-slate-400">{model.modelId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${getStatusColor(model.status)}`}>
                        {model.status.toUpperCase()}
                      </div>
                      {model.responseTime && (
                        <div className="text-xs text-slate-400">{model.responseTime}ms</div>
                      )}
                    </div>
                  </div>
                  {model.error && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      Error: {model.error}
                    </div>
                  )}
                  {model.lastChecked && (
                    <div className="mt-1 text-xs text-slate-500">
                      Last checked: {new Date(model.lastChecked).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {healthStatus.length === 0 && !isChecking && (
          <div className="text-center py-8 text-slate-400">
            Click "Check Model Health" to test all available models
          </div>
        )}
      </div>

      {/* Environment Variables Info */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <h4 className="text-lg font-medium text-slate-100 mb-3">🔧 Environment Configuration</h4>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Model Discovery:</span>
            <span className="text-slate-200">
              {import.meta.env.VITE_ENABLE_MODEL_DISCOVERY !== 'false' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Validation Timeout:</span>
            <span className="text-slate-200">
              {import.meta.env.VITE_MODEL_VALIDATION_TIMEOUT || '30000'}ms
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Logging Enabled:</span>
            <span className="text-slate-200">
              {import.meta.env.VITE_ENABLE_MODEL_LOGGING === 'true' ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">API Base URL:</span>
            <span className="text-slate-200 text-xs">
              {import.meta.env.VITE_GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};