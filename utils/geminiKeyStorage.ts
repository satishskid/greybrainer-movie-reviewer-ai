// Utility functions for managing Gemini API key storage

const GEMINI_API_KEY_STORAGE_KEY = 'greybrainer_gemini_api_key';
const GEMINI_KEY_VALIDATION_STORAGE_KEY = 'greybrainer_gemini_key_validated';

// Import quota reset function to clear quota status when new key is stored
let resetQuotaStatus: (() => void) | null = null;

// Lazy import to avoid circular dependency
const getResetQuotaFunction = async () => {
  if (!resetQuotaStatus) {
    try {
      const geminiService = await import('../services/geminiService');
      resetQuotaStatus = geminiService.resetQuotaStatus;
    } catch (error) {
      console.warn('Could not import resetQuotaStatus function:', error);
    }
  }
  return resetQuotaStatus;
};

export interface GeminiKeyInfo {
  apiKey: string;
  isValidated: boolean;
  lastValidated?: number;
}

/**
 * Store Gemini API key in localStorage
 */
export const storeGeminiApiKey = async (apiKey: string, isValidated: boolean = false): Promise<void> => {
  try {
    const keyInfo: GeminiKeyInfo = {
      apiKey,
      isValidated,
      lastValidated: isValidated ? Date.now() : undefined,
    };
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, JSON.stringify(keyInfo));
    
    // Reset quota status when new API key is stored to clear any persisting quota exceeded status
    const resetFn = await getResetQuotaFunction();
    if (resetFn) {
      resetFn();
      console.log('Quota status reset for new API key');
    }
  } catch (error) {
    console.error('Failed to store Gemini API key:', error);
  }
};

/**
 * Retrieve Gemini API key from localStorage
 */
export const getGeminiApiKey = (): GeminiKeyInfo | null => {
  try {
    const stored = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (!stored) return null;
    
    const keyInfo: GeminiKeyInfo = JSON.parse(stored);
    return keyInfo;
  } catch (error) {
    console.error('Failed to retrieve Gemini API key:', error);
    return null;
  }
};

/**
 * Get just the API key string (for use in services)
 */
export const getGeminiApiKeyString = (): string | null => {
  const keyInfo = getGeminiApiKey();
  return keyInfo ? keyInfo.apiKey : null;
};

/**
 * Check if user has a stored Gemini API key
 */
export const hasGeminiApiKey = (): boolean => {
  const keyInfo = getGeminiApiKey();
  return keyInfo !== null && keyInfo.apiKey.length > 0;
};

/**
 * Check if the stored Gemini API key is validated
 */
export const isGeminiKeyValidated = (): boolean => {
  const keyInfo = getGeminiApiKey();
  return keyInfo !== null && keyInfo.isValidated === true;
};

/**
 * Remove Gemini API key from localStorage
 */
export const removeGeminiApiKey = (): void => {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove Gemini API key:', error);
  }
};

/**
 * Update validation status of stored key
 */
export const updateGeminiKeyValidation = async (isValidated: boolean): Promise<void> => {
  const keyInfo = getGeminiApiKey();
  if (keyInfo) {
    await storeGeminiApiKey(keyInfo.apiKey, isValidated);
  }
};

/**
 * Validate Gemini API key format (basic check)
 */
export const isValidGeminiKeyFormat = (apiKey: string): boolean => {
  // Basic format validation for Gemini API keys
  // Gemini API keys typically start with 'AIza' and are 39 characters long
  return apiKey.startsWith('AIza') && apiKey.length === 39;
};

/**
 * Check if key validation is expired (older than 24 hours)
 */
export const isKeyValidationExpired = (): boolean => {
  const keyInfo = getGeminiApiKey();
  if (!keyInfo || !keyInfo.lastValidated) return true;
  
  const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return Date.now() - keyInfo.lastValidated > twentyFourHours;
};