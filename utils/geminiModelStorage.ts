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
    'gemini-pro'                  // Legacy fallback
  ];
  
  console.log('🎬 Setting up optimal model for film analysis...');
  
  for (const modelId of greybrainerOrder) {
    const model = AVAILABLE_GEMINI_MODELS.find(m => m.id === modelId);
    if (!model) continue;
    
    console.log(`Testing: ${model.name}`);
    const works = await testGeminiModel(apiKey, modelId);
    if (works) {
      console.log(`✅ Greybrainer configured with: ${model.name}`);
      setSelectedGeminiModel(modelId);
      return modelId;
    }
  }
  
  console.warn('❌ No compatible models found for your API key');
  return null;
};

// Legacy function for manual detection
export const autoDetectWorkingModel = autoSetupGreybrainerModel;