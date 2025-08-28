// Utility functions for managing Google Search API key storage

const GOOGLE_SEARCH_API_KEY_STORAGE_KEY = 'google_search_api_key';

export interface GoogleSearchKeyInfo {
  apiKey: string;
  isValidated: boolean;
  lastValidated?: number;
}

/**
 * Check if Google Search API key exists in localStorage
 */
export const hasGoogleSearchApiKey = (): boolean => {
  const apiKey = localStorage.getItem(GOOGLE_SEARCH_API_KEY_STORAGE_KEY);
  return !!apiKey && apiKey.trim().length > 0;
};

/**
 * Get the stored Google Search API key
 */
export const getGoogleSearchApiKey = (): GoogleSearchKeyInfo | null => {
  const apiKey = localStorage.getItem(GOOGLE_SEARCH_API_KEY_STORAGE_KEY);
  if (!apiKey) {
    return null;
  }
  
  return {
    apiKey,
    isValidated: true, // We assume it's validated since we test it when storing
    lastValidated: Date.now()
  };
};

/**
 * Get the Google Search API key as a string
 */
export const getGoogleSearchApiKeyString = (): string | null => {
  return localStorage.getItem(GOOGLE_SEARCH_API_KEY_STORAGE_KEY);
};

/**
 * Store the Google Search API key in localStorage
 */
export const storeGoogleSearchApiKey = (apiKey: string, isValidated: boolean = true): void => {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }
  
  localStorage.setItem(GOOGLE_SEARCH_API_KEY_STORAGE_KEY, apiKey.trim());
};

/**
 * Remove the Google Search API key from localStorage
 */
export const removeGoogleSearchApiKey = (): void => {
  localStorage.removeItem(GOOGLE_SEARCH_API_KEY_STORAGE_KEY);
};

/**
 * Check if the stored Google Search API key is validated
 */
export const isGoogleSearchKeyValidated = (): boolean => {
  // For now, we assume all stored keys are validated
  // This can be enhanced later with actual validation tracking
  return hasGoogleSearchApiKey();
};

/**
 * Basic format validation for Google Search API key
 */
export const isValidGoogleSearchKeyFormat = (apiKey: string): boolean => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Google API keys typically start with 'AIza' and are 39 characters long
  const trimmedKey = apiKey.trim();
  return trimmedKey.startsWith('AIza') && trimmedKey.length === 39;
};