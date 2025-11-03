// Gemini Model Storage and Management
// Handles user-configurable model selection for BYOK approach

export interface GeminiModelOption {
  id: string;
  name: string;
  description: string;
  isRecommended?: boolean;
  isDeprecated?: boolean;
}

// Available Gemini models optimized for film analysis
export const AVAILABLE_GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-1.5-pro-latest',
    name: 'Greybrainer Pro (Recommended)',
    description: 'Best for detailed film analysis, character development, and narrative structure',
    isRecommended: true
  },
  {
    id: 'gemini-1.5-flash-latest',
    name: 'Greybrainer Fast',
    description: 'Quick analysis for rapid reviews and initial assessments'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Greybrainer Pro (Stable)',
    description: 'Stable version for consistent professional analysis'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Greybrainer Fast (Stable)',
    description: 'Stable version for quick film evaluations'
  },
  {
    id: 'gemini-pro',
    name: 'Legacy Model',
    description: 'Older model - use only if others fail',
    isDeprecated: true
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Legacy Model (v1.0)',
    description: 'First generation - use only if others fail',
    isDeprecated: true
  }
];

const GEMINI_MODEL_KEY = 'greybrainer_gemini_model';
const GREYBRAINER_PREFERRED_MODEL = 'gemini-1.5-pro-latest'; // Best for film analysis
const GREYBRAINER_FALLBACK_MODEL = 'gemini-1.5-flash-latest'; // Fast alternative

// Get selected Gemini model (smart default for film professionals)
export const getSelectedGeminiModel = (): string => {
  try {
    const stored = localStorage.getItem(GEMINI_MODEL_KEY);
    if (stored && AVAILABLE_GEMINI_MODELS.some(m => m.id === stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Error reading stored Gemini model:', error);
  }
  // Return Greybrainer's preferred model for film analysis
  return GREYBRAINER_PREFERRED_MODEL;
};

// Set selected Gemini model
export const setSelectedGeminiModel = (modelId: string): void => {
  try {
    if (AVAILABLE_GEMINI_MODELS.some(m => m.id === modelId)) {
      localStorage.setItem(GEMINI_MODEL_KEY, modelId);
    } else {
      throw new Error(`Invalid model ID: ${modelId}`);
    }
  } catch (error) {
    console.error('Error storing Gemini model:', error);
    throw error;
  }
};

// Get model info
export const getModelInfo = (modelId: string): GeminiModelOption | null => {
  return AVAILABLE_GEMINI_MODELS.find(m => m.id === modelId) || null;
};

// Get Greybrainer's recommended model for film analysis
export const getRecommendedModel = (): string => {
  return GREYBRAINER_PREFERRED_MODEL;
};

// Get fallback model if preferred doesn't work
export const getFallbackModel = (): string => {
  return GREYBRAINER_FALLBACK_MODEL;
};

// Test if a model works with user's API key
export const testGeminiModel = async (apiKey: string, modelId: string): Promise<boolean> => {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelId });
    
    // Simple test prompt
    const result = await model.generateContent('Say "test" and nothing else.');
    const response = await result.response;
    const text = response.text();
    
    return text.toLowerCase().includes('test');
  } catch (error) {
    console.warn(`Model ${modelId} test failed:`, error);
    return false;
  }
};

// Auto-setup best model for film analysis (optimized for Greybrainer)
export const autoSetupGreybrainerModel = async (apiKey: string): Promise<string | null> => {
  // Test Greybrainer's preferred models in order
  const greybrainerOrder = [
    GREYBRAINER_PREFERRED_MODEL,  // Best for detailed analysis
    GREYBRAINER_FALLBACK_MODEL,   // Fast alternative
    'gemini-1.5-pro',             // Stable pro
    'gemini-1.5-flash',           // Stable fast
    'gemini-pro',                 // Legacy fallback
    'gemini-1.0-pro'              // Last resort
  ];
  
  console.log('🎬 Setting up optimal model for film analysis...');
  
  for (const modelId of greybrainerOrder) {
    const model = AVAILABLE_GEMINI_MODELS.find(m => m.id === modelId);
    console.log(`Testing: ${model?.name || modelId}`);
    
    const works = await testGeminiModel(apiKey, modelId);
    if (works) {
      console.log(`✅ Greybrainer configured with: ${model?.name || modelId}`);
      setSelectedGeminiModel(modelId);
      return modelId;
    }
  }
  
  console.warn('❌ No compatible models found for your API key');
  return null;
};

// Dynamic model discovery - fetch available models from Google API
export const discoverAvailableModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (response.ok && data.models) {
      const modelIds = data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => model.name.replace('models/', ''));
      
      console.log('🔍 Discovered models:', modelIds);
      return modelIds;
    }
  } catch (error) {
    console.warn('Could not discover models:', error);
  }
  return [];
};

// Future-proof auto-setup that adapts to new models
export const futureProofModelSetup = async (apiKey: string): Promise<string | null> => {
  console.log('🚀 Future-proof model setup starting...');
  
  // First try our known good models
  const knownGoodModel = await autoSetupGreybrainerModel(apiKey);
  if (knownGoodModel) {
    return knownGoodModel;
  }
  
  // If none work, discover what's actually available
  console.log('🔍 Discovering available models...');
  const availableModels = await discoverAvailableModels(apiKey);
  
  if (availableModels.length === 0) {
    console.warn('❌ No models discovered');
    return null;
  }
  
  // Test discovered models, prioritizing newer/better ones
  const priorityPatterns = [
    /gemini.*pro.*latest/i,     // Latest pro models
    /gemini.*flash.*latest/i,   // Latest flash models
    /gemini.*1\.5.*pro/i,       // 1.5 pro models
    /gemini.*1\.5.*flash/i,     // 1.5 flash models
    /gemini.*pro/i,             // Any pro model
    /gemini.*flash/i,           // Any flash model
    /gemini/i                   // Any gemini model
  ];
  
  for (const pattern of priorityPatterns) {
    const matchingModels = availableModels.filter(model => pattern.test(model));
    
    for (const modelId of matchingModels) {
      console.log(`🧪 Testing discovered model: ${modelId}`);
      const works = await testGeminiModel(apiKey, modelId);
      if (works) {
        console.log(`✅ Found working model: ${modelId}`);
        setSelectedGeminiModel(modelId);
        return modelId;
      }
    }
  }
  
  console.warn('❌ No working models found even after discovery');
  return null;
};

// Legacy function for manual detection
export const autoDetectWorkingModel = autoSetupGreybrainerModel;

// Check if there are newer models available than what we know about
export const checkForNewerModels = async (apiKey: string): Promise<{hasNewer: boolean, newModels: string[]}> => {
  try {
    const availableModels = await discoverAvailableModels(apiKey);
    const knownModelIds = AVAILABLE_GEMINI_MODELS.map(m => m.id);
    const newModels = availableModels.filter(model => !knownModelIds.includes(model));
    
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