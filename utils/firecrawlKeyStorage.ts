// Utility functions for managing Firecrawl API key storage

const FIRECRAWL_API_KEY_STORAGE_KEY = 'firecrawl_api_key';

export interface FirecrawlKeyInfo {
  apiKey: string;
  isValidated: boolean;
  lastValidated?: number;
}

/**
 * Check if Firecrawl API key exists in localStorage or environment variables
 */
export const hasFirecrawlApiKey = (): boolean => {
  const apiKey = getFirecrawlApiKey();
  return !!apiKey && apiKey.trim().length > 0;
};

/**
 * Get the Firecrawl API key from localStorage or environment variables
 */
export const getFirecrawlApiKey = (): string | null => {
  const storedKey = localStorage.getItem(FIRECRAWL_API_KEY_STORAGE_KEY);
  if (storedKey && storedKey.trim().length > 0) return storedKey;
  
  // Fallback to environment variable if available (e.g. during development)
  return import.meta.env.VITE_FIRECRAWL_API_KEY || null;
};

/**
 * Save the Firecrawl API key to localStorage
 */
export const setFirecrawlApiKey = (apiKey: string): void => {
  localStorage.setItem(FIRECRAWL_API_KEY_STORAGE_KEY, apiKey.trim());
};

/**
 * Remove the Firecrawl API key from localStorage
 */
export const removeFirecrawlApiKey = (): void => {
  localStorage.removeItem(FIRECRAWL_API_KEY_STORAGE_KEY);
};
