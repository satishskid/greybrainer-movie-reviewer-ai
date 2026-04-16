const GROQ_API_KEY_STORAGE_KEY = 'greybrainer_groq_api_key';
const GROQ_KEY_VALIDATION_STORAGE_KEY = 'greybrainer_groq_key_validated';
const GROQ_API_KEY_ENV_FALLBACK = import.meta.env.VITE_GROQ_API_KEY?.trim() || null;

export interface GroqKeyInfo {
  apiKey: string;
  isValidated: boolean;
  lastValidated?: number;
}

export const storeGroqApiKey = async (apiKey: string, isValidated: boolean = false): Promise<void> => {
  try {
    const normalizedKey = apiKey.trim();
    const keyInfo: GroqKeyInfo = {
      apiKey: normalizedKey,
      isValidated,
      lastValidated: isValidated ? Date.now() : undefined,
    };

    localStorage.setItem(GROQ_API_KEY_STORAGE_KEY, JSON.stringify(keyInfo));
    localStorage.setItem(GROQ_KEY_VALIDATION_STORAGE_KEY, isValidated ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to store Groq API key:', error);
  }
};

export const getGroqApiKey = (): GroqKeyInfo | null => {
  try {
    const stored = localStorage.getItem(GROQ_API_KEY_STORAGE_KEY);
    if (!stored) {
      return GROQ_API_KEY_ENV_FALLBACK
        ? {
            apiKey: GROQ_API_KEY_ENV_FALLBACK,
            isValidated: true,
          }
        : null;
    }

    const keyInfo: GroqKeyInfo = JSON.parse(stored);
    if (!keyInfo?.apiKey?.trim()) {
      return GROQ_API_KEY_ENV_FALLBACK
        ? {
            apiKey: GROQ_API_KEY_ENV_FALLBACK,
            isValidated: true,
          }
        : null;
    }

    return {
      ...keyInfo,
      apiKey: keyInfo.apiKey.trim(),
    };
  } catch (error) {
    console.error('Failed to retrieve Groq API key:', error);
    return GROQ_API_KEY_ENV_FALLBACK
      ? {
          apiKey: GROQ_API_KEY_ENV_FALLBACK,
          isValidated: true,
        }
      : null;
  }
};

export const getGroqApiKeyString = (): string | null => {
  const keyInfo = getGroqApiKey();
  return keyInfo ? keyInfo.apiKey.trim() : null;
};

export const hasGroqApiKey = (): boolean => {
  const keyInfo = getGroqApiKey();
  return keyInfo !== null && keyInfo.apiKey.trim().length > 0;
};

export const isGroqKeyValidated = (): boolean => {
  const keyInfo = getGroqApiKey();
  return keyInfo !== null && keyInfo.isValidated === true;
};

export const removeGroqApiKey = (): void => {
  try {
    localStorage.removeItem(GROQ_API_KEY_STORAGE_KEY);
    localStorage.removeItem(GROQ_KEY_VALIDATION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to remove Groq API key:', error);
  }
};

export const updateGroqKeyValidation = async (isValidated: boolean): Promise<void> => {
  const keyInfo = getGroqApiKey();
  if (keyInfo) {
    await storeGroqApiKey(keyInfo.apiKey, isValidated);
  }
};

export const isValidGroqKeyFormat = (apiKey: string): boolean => {
  const normalizedKey = apiKey.trim();
  return normalizedKey.startsWith('gsk_') && normalizedKey.length >= 24;
};