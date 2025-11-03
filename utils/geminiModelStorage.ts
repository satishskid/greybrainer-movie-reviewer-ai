/**
 * Gemini Model Storage and Management (Legacy Compatibility Layer)
 * 
 * This file now serves as a compatibility layer for the new ModelConfigurationService.
 * All new code should use services/modelConfigService.ts directly.
 */

import { 
  modelConfigService, 
  getSelectedGeminiModel as getSelectedModel,
  setSelectedGeminiModel as setSelectedModel,
  getModelInfo as getModelInformation,
  autoSetupGreybrainerModel as autoSetupModel,
  AVAILABLE_GEMINI_MODELS as AVAILABLE_MODELS,
  type GeminiModelConfig
} from '../services/modelConfigService';

// Legacy interface for backward compatibility
export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  isRecommended?: boolean;
  isDeprecated?: boolean;
}

// Convert new format to legacy format for compatibility
export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = AVAILABLE_MODELS.map(model => ({
  id: model.id,
  name: model.name,
  description: model.description,
  isRecommended: model.isRecommended,
  isDeprecated: model.isDeprecated
}));

// Legacy functions - delegate to new service
export const getSelectedGeminiModel = getSelectedModel;
export const setSelectedGeminiModel = setSelectedModel;
export const getModelInfo = (modelId: string): GeminiModelOption | null => {
  const info = getModelInformation(modelId);
  if (!info) return null;
  
  return {
    id: info.id,
    name: info.name,
    description: info.description,
    isRecommended: info.isRecommended,
    isDeprecated: info.isDeprecated
  };
};

// Get Greybrainer's recommended model for film analysis
export const getRecommendedModel = (): string => {
  return modelConfigService.getSelectedModel();
};

// Get fallback model if preferred doesn't work
export const getFallbackModel = (): string => {
  return modelConfigService.getFallbackModel();
};

// Test if a model works with user's API key
export const testGeminiModel = async (apiKey: string, modelId: string): Promise<boolean> => {
  const result = await modelConfigService.validateModel(apiKey, modelId);
  return result.isValid;
};

// Auto-setup best model for film analysis (optimized for Greybrainer)
export const autoSetupGreybrainerModel = autoSetupModel;

// Dynamic model discovery - fetch available models from Google API
export const discoverAvailableModels = async (apiKey: string): Promise<string[]> => {
  return await modelConfigService.discoverModels(apiKey);
};

// Future-proof auto-setup that adapts to new models
export const futureProofModelSetup = async (apiKey: string): Promise<string | null> => {
  return await modelConfigService.autoSetupBestModel(apiKey);
};

// Legacy function for manual detection
export const autoDetectWorkingModel = autoSetupModel;

// Check if there are newer models available than what we know about
export const checkForNewerModels = async (apiKey: string): Promise<{hasNewer: boolean, newModels: string[]}> => {
  try {
    const discoveredModels = await modelConfigService.discoverModels(apiKey);
    const knownModelIds = AVAILABLE_GEMINI_MODELS.map(m => m.id);
    const newModels = discoveredModels.filter(model => !knownModelIds.includes(model));
    
    return {
      hasNewer: newModels.length > 0,
      newModels
    };
  } catch (error) {
    console.warn('Could not check for newer models:', error);
    return { hasNewer: false, newModels: [] };
  }
};

// Get model update recommendations
export const getModelUpdateRecommendations = async (apiKey: string): Promise<string[]> => {
  const { newModels } = await checkForNewerModels(apiKey);
  
  // Filter for models that look like upgrades
  const recommendations = newModels.filter(model => {
    const modelLower = model.toLowerCase();
    return (
      modelLower.includes('latest') ||
      modelLower.includes('2.0') ||
      modelLower.includes('1.6') ||
      (modelLower.includes('pro') && modelLower.includes('1.5'))
    );
  });
  
  return recommendations;
};

// Get configuration summary for debugging
export const getConfigurationSummary = () => modelConfigService.getConfigurationSummary();