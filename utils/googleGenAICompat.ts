import { GoogleGenAI } from '@google/genai';

type ApiVersion = 'v1' | 'v1beta';

interface GenerativeModelOptions {
  model: string;
  generationConfig?: Record<string, unknown>;
  tools?: any[];
  systemInstruction?: string;
}

interface RequestOptions {
  apiVersion?: ApiVersion;
}

type CompatUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  [key: string]: unknown;
};

type CompatResponse = {
  text: () => string;
  candidates?: any[];
  usageMetadata?: CompatUsageMetadata;
  [key: string]: unknown;
};

export type GenerateContentResult = {
  response: CompatResponse;
  rawResponse: any;
};

const extractText = (rawResponse: any): string => {
  if (!rawResponse) return '';

  if (typeof rawResponse.text === 'function') {
    return rawResponse.text();
  }

  if (typeof rawResponse.text === 'string') {
    return rawResponse.text;
  }

  const parts = rawResponse.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('');
  }

  return '';
};

const wrapGenerateContentResponse = (rawResponse: any): GenerateContentResult => ({
  response: {
    ...rawResponse,
    text: () => extractText(rawResponse),
  },
  rawResponse,
});

const normalizeTools = (tools?: any[]) => {
  if (!tools?.length) return undefined;
  return tools.map((tool) => {
    if (!tool || typeof tool !== 'object') return tool;
    return { ...tool };
  });
};

const buildConfig = (options: GenerativeModelOptions) => {
  const config: Record<string, unknown> = {
    ...(options.generationConfig ?? {}),
  };

  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  const normalizedTools = normalizeTools(options.tools);
  if (normalizedTools?.length) {
    config.tools = normalizedTools;
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

class CompatGenerativeModel {
  private readonly client: GoogleGenAI;
  private readonly options: GenerativeModelOptions;

  constructor(client: GoogleGenAI, options: GenerativeModelOptions) {
    this.client = client;
    this.options = options;
  }

  async generateContent(contents: any): Promise<GenerateContentResult> {
    const rawResponse = await this.client.models.generateContent({
      model: this.options.model,
      contents,
      config: buildConfig(this.options),
    } as any);

    return wrapGenerateContentResponse(rawResponse);
  }
}

export class GoogleGenerativeAI {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getGenerativeModel(options: GenerativeModelOptions, requestOptions?: RequestOptions) {
    const apiVersion = requestOptions?.apiVersion;
    const client = new GoogleGenAI({
      apiKey: this.apiKey,
      ...(apiVersion ? { apiVersion } : {}),
    } as any);

    return new CompatGenerativeModel(client, options);
  }
}