/**
 * Gemini Model Configuration Service
 * 
 * Provides robust, production-ready model configuration management with:
 * - Environment variable support
 * - Configuration file fallbacks
 * - Model discovery API integration
 * - Error handling and logging
 * - Validation and health checks
 */

import modelConfig from '../config/gemini-models.json';

// Enhanced model interface with metadata
export interface GeminiModelConfig {
  id: string;
  name: string;
  description: string;
  category: 'premium' | 'standard' | 'basic' | 'legacy';
  isRecommended: boolean;
  isStable: boolean;
  maxTokens: number;
  costTier: 'premium' | 'standard' | 'economy' | 'legacy';
  lastVerified: string;
  isDeprecated?: boolean;
  deprecationWarning?: string;
  useCase?: string;
  apiVersion?: string;
}

export interface ModelDiscoveryPattern {
  pattern: string;
  priority: number;
  description: string;
}

export interface ModelValidationResult {
  modelId: string;
  isValid: boolean;
  responseTime?: number;
  error?: string;
  timestamp: string;
}

export interface ModelConfigurationState {
  preferredModel: string;
  fallbackModel: string;
  legacyModel: string;
  availableModels: GeminiModelConfig[];
  discoveredModels: string[];
  validationResults: Record<string, ModelValidationResult>;
  lastDiscovery: string | null;
  configVersion: string;
}

class ModelConfigurationService {
  private config: ModelConfigurationState;
  private logger: Console;

  constructor() {
    this.logger = console;
    this.config = this.initializeConfiguration();
  }

  /**
   * Initialize configuration from environment variables and config file
   */
  private initializeConfiguration(): ModelConfigurationState {
    const envPreferred = import.meta.env.VITE_GEMINI_PREFERRED_MODEL;
    const envFallback = import.meta.env.VITE_GEMINI_FALLBACK_MODEL;
    const envLegacy = import.meta.env.VITE_GEMINI_LEGACY_MODEL;

    return {
      preferredModel: envPreferred || modelConfig.defaultModels.preferred,
      fallbackModel: envFallback || modelConfig.defaultModels.fallback,
      legacyModel: envLegacy || modelConfig.defaultModels.legacy,
      availableModels: modelConfig.availableModels as GeminiModelConfig[],
      discoveredModels: [],
      validationResults: {},
      lastDiscovery: null,
      configVersion: modelConfig.modelConfiguration.version
    };
  }

  /**
   * Get the currently selected model with environment variable override
   */
  getSelectedModel(): string {
    const stored = localStorage.getItem('greybrainer_gemini_model');
    
    // Check if stored model is still available in current configuration
    if (stored && this.isModelAvailable(stored)) {
      return stored;
    }
    
    // If stored model is invalid, clear it and use preferred model
    if (stored && !this.isModelAvailable(stored)) {
      localStorage.removeItem('greybrainer_gemini_model');
      this.logInfo(`Cleared invalid stored model: ${stored}`);
    }
    
    return this.config.preferredModel;
  }

  /**
   * Get fallback model for error recovery
   */
  getFallbackModel(): string {
    return this.config.fallbackModel;
  }

  /**
   * Get legacy model for emergency fallback
   */
  getLegacyModel(): string {
    return this.config.legacyModel;
  }

  /**
   * Get all available models with metadata
   */
  getAvailableModels(): GeminiModelConfig[] {
    return this.config.availableModels.filter(model => !model.isDeprecated);
  }

  /**
   * Get model information by ID
   */
  getModelInfo(modelId: string): GeminiModelConfig | null {
    return this.config.availableModels.find(model => model.id === modelId) || null;
  }

  /**
   * Check if a model is available in configuration
   */
  isModelAvailable(modelId: string): boolean {
    return this.config.availableModels.some(model => model.id === modelId);
  }

  /**
   * Set selected model with validation
   */
  setSelectedModel(modelId: string): boolean {
    if (!this.isModelAvailable(modelId)) {
      this.logError(`Attempted to set invalid model: ${modelId}`);
      return false;
    }

    try {
      localStorage.setItem('greybrainer_gemini_model', modelId);
      this.logInfo(`Model updated to: ${modelId}`);
      return true;
    } catch (error) {
      this.logError(`Failed to store model selection: ${error}`);
      return false;
    }
  }

  /**
   * Discover available models from Google API
   */
  async discoverModels(apiKey: string): Promise<string[]> {
    if (!this.isModelDiscoveryEnabled()) {
      return [];
    }

    try {
      this.logInfo('Starting model discovery...');
      
      const response = await fetch(
        `${this.getApiBaseUrl()}/v1beta/models?key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Discovery API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.models) {
        const discoveredModels = data.models
          .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
          .map((model: any) => model.name.replace('models/', ''));

        this.config.discoveredModels = discoveredModels;
        this.config.lastDiscovery = new Date().toISOString();
        
        this.logInfo(`Discovered ${discoveredModels.length} models:`, discoveredModels);
        return discoveredModels;
      }

      return [];
    } catch (error) {
      this.logError('Model discovery failed:', error);
      return [];
    }
  }

  /**
   * Validate a model by testing it with a simple prompt
   */
  async validateModel(apiKey: string, modelId: string): Promise<ModelValidationResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelId });

      const testPrompt = modelConfig.validation.testPrompt;
      const expectedResponse = modelConfig.validation.expectedResponse;

      // Set timeout for validation
      const timeout = this.getValidationTimeout();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const result = await model.generateContent(testPrompt);
        clearTimeout(timeoutId);
        
        const response = await result.response;
        const text = response.text().toLowerCase().trim();
        
        const responseTime = Date.now() - startTime;
        const isValid = text.includes(expectedResponse.toLowerCase());

        const validationResult: ModelValidationResult = {
          modelId,
          isValid,
          responseTime,
          timestamp
        };

        if (!isValid) {
          validationResult.error = `Unexpected response: "${text}"`;
        }

        this.config.validationResults[modelId] = validationResult;
        
        this.logInfo(`Model ${modelId} validation: ${isValid ? 'PASSED' : 'FAILED'} (${responseTime}ms)`);
        return validationResult;

      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const validationResult: ModelValidationResult = {
        modelId,
        isValid: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };

      this.config.validationResults[modelId] = validationResult;
      this.logError(`Model ${modelId} validation failed:`, error);
      return validationResult;
    }
  }

  /**
   * Auto-setup best working model with comprehensive fallback strategy
   */
  async autoSetupBestModel(apiKey: string): Promise<string | null> {
    this.logInfo('🎬 Starting intelligent model setup for film analysis...');

    // Step 1: Try configured models in priority order
    const priorityModels = [
      this.config.preferredModel,
      this.config.fallbackModel,
      this.config.legacyModel,
      ...modelConfig.modelPriority.filter(id => 
        ![this.config.preferredModel, this.config.fallbackModel, this.config.legacyModel].includes(id)
      )
    ];

    for (const modelId of priorityModels) {
      this.logInfo(`Testing configured model: ${modelId}`);
      const result = await this.validateModel(apiKey, modelId);
      
      if (result.isValid) {
        this.setSelectedModel(modelId);
        this.logInfo(`✅ Successfully configured with: ${modelId}`);
        return modelId;
      }
    }

    // Step 2: Discover and test new models if enabled
    if (this.isModelDiscoveryEnabled()) {
      this.logInfo('🔍 Discovering available models...');
      const discoveredModels = await this.discoverModels(apiKey);
      
      if (discoveredModels.length > 0) {
        const prioritizedDiscovered = this.prioritizeDiscoveredModels(discoveredModels);
        
        for (const modelId of prioritizedDiscovered) {
          if (!priorityModels.includes(modelId)) {
            this.logInfo(`Testing discovered model: ${modelId}`);
            const result = await this.validateModel(apiKey, modelId);
            
            if (result.isValid) {
              this.setSelectedModel(modelId);
              this.logInfo(`✅ Successfully configured with discovered model: ${modelId}`);
              return modelId;
            }
          }
        }
      }
    }

    this.logError('❌ No working models found');
    return null;
  }

  /**
   * Prioritize discovered models based on patterns
   */
  private prioritizeDiscoveredModels(models: string[]): string[] {
    const patterns = modelConfig.discoveryPatterns as ModelDiscoveryPattern[];
    const prioritized: Array<{ model: string; priority: number }> = [];

    for (const model of models) {
      let bestPriority = 999;
      
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.pattern, 'i');
        if (regex.test(model)) {
          bestPriority = Math.min(bestPriority, pattern.priority);
        }
      }
      
      prioritized.push({ model, priority: bestPriority });
    }

    return prioritized
      .sort((a, b) => a.priority - b.priority)
      .map(item => item.model);
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigurationSummary(): object {
    return {
      version: this.config.configVersion,
      selectedModel: this.getSelectedModel(),
      preferredModel: this.config.preferredModel,
      fallbackModel: this.config.fallbackModel,
      availableModels: this.config.availableModels.length,
      discoveredModels: this.config.discoveredModels.length,
      lastDiscovery: this.config.lastDiscovery,
      validationResults: Object.keys(this.config.validationResults).length,
      environmentOverrides: {
        preferredModel: !!import.meta.env.VITE_GEMINI_PREFERRED_MODEL,
        fallbackModel: !!import.meta.env.VITE_GEMINI_FALLBACK_MODEL,
        discoveryEnabled: this.isModelDiscoveryEnabled()
      }
    };
  }

  /**
   * Utility methods
   */
  private isModelDiscoveryEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_MODEL_DISCOVERY !== 'false';
  }

  private getApiBaseUrl(): string {
    return import.meta.env.VITE_GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com';
  }

  private getValidationTimeout(): number {
    return parseInt(import.meta.env.VITE_MODEL_VALIDATION_TIMEOUT || '30000');
  }

  private isLoggingEnabled(): boolean {
    return import.meta.env.VITE_ENABLE_MODEL_LOGGING === 'true';
  }

  private getLogLevel(): string {
    return import.meta.env.VITE_LOG_LEVEL || 'info';
  }

  private logInfo(message: string, ...args: any[]): void {
    if (this.isLoggingEnabled() && ['debug', 'info'].includes(this.getLogLevel())) {
      this.logger.log(`[ModelConfig] ${message}`, ...args);
    }
  }

  private logError(message: string, ...args: any[]): void {
    if (this.isLoggingEnabled()) {
      this.logger.error(`[ModelConfig] ${message}`, ...args);
    }
  }
}

// Export singleton instance
export const modelConfigService = new ModelConfigurationService();

// Export legacy functions for backward compatibility
export const getSelectedGeminiModel = () => modelConfigService.getSelectedModel();
export const setSelectedGeminiModel = (modelId: string) => modelConfigService.setSelectedModel(modelId);
export const getModelInfo = (modelId: string) => modelConfigService.getModelInfo(modelId);
export const autoSetupGreybrainerModel = (apiKey: string) => modelConfigService.autoSetupBestModel(apiKey);
export const AVAILABLE_GEMINI_MODELS = modelConfigService.getAvailableModels();

// Export types
export type { GeminiModelConfig as GeminiModelOption };