// Utility functions for managing Firecrawl API key storage

const FIRECRAWL_API_KEY_STORAGE_KEY = 'firecrawl_api_key';

export interface FirecrawlKeyInfo {
  apiKey: string;
  isValidated: boolean;
  lastValidated?: number;
}

/**
 * Check if Firecrawl API key exists in localStorage
 */
export const hasFirecrawlApiKey = (): boolean => {
  const apiKey = localStorage.getItem(FIRECRAWL_API_KEY_STORAGE_KEY);
  return !!apiKey && apiKey.trim().length > 0;
};

/**
 * Get the Firecrawl API key from localStorage
 */
export const getFirecrawlApiKey = (): string | null => {
  return localStorage.getItem(FIRECRAWL_API_KEY_STORAGE_KEY);
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
