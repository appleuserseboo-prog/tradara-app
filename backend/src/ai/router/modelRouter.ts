// ==========================================
// FILE: backend/src/ai/router/modelRouter.ts
// ==========================================

import { IAiProvider } from '../providers/aiProvider.interface';
import { OpenAIProvider } from '../providers/openAIProvider';
import { GeminiProvider } from '../providers/geminiProvider';

export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'analytical' | 'creative';

export interface RouteRequestOptions {
  preferredProvider?: string;
  complexity?: TaskComplexity;
  requiresTools?: boolean;
}

export class ModelRouter {
  private static instance: ModelRouter;
  private providers: Map<string, IAiProvider> = new Map();
  private defaultProviderName: string = 'gemini';

  private constructor() {
    this.registerDefaultProviders();
  }

  public static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter();
    }
    return ModelRouter.instance;
  }

  private registerDefaultProviders(): void {
    const gemini = new GeminiProvider();
    const openAI = new OpenAIProvider();

    this.providers.set(gemini.name, gemini);
    this.providers.set(openAI.name, openAI);

    if (process.env.DEFAULT_AI_PROVIDER) {
      this.defaultProviderName = process.env.DEFAULT_AI_PROVIDER.toLowerCase();
    }
  }

  public registerProvider(provider: IAiProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public getProvider(name: string): IAiProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  public resolveProvider(options?: RouteRequestOptions): IAiProvider {
    if (options?.preferredProvider && this.providers.has(options.preferredProvider.toLowerCase())) {
      return this.providers.get(options.preferredProvider.toLowerCase())!;
    }

    if (options?.complexity === 'complex' || options?.complexity === 'analytical') {
      if (process.env.OPENAI_API_KEY && this.providers.has('openai')) {
        return this.providers.get('openai')!;
      }
    }

    if (this.providers.has(this.defaultProviderName)) {
      return this.providers.get(this.defaultProviderName)!;
    }

    const firstAvailable = Array.from(this.providers.values())[0];
    if (!firstAvailable) {
      throw new Error('[ModelRouter] No AI providers registered or available.');
    }

    return firstAvailable;
  }
}

export const modelRouter = ModelRouter.getInstance();