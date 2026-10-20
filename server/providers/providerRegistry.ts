import { AIProviderAdapter, ProviderStatus } from './providerAdapter';
import { GeminiVeoProvider } from './geminiProvider';
import { GrokImagineProvider } from './grokProvider';
import { MockLocalProvider } from './mockProvider';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private adapters: Map<string, AIProviderAdapter> = new Map();

  private constructor() {
    this.register(new MockLocalProvider());
    this.register(new GeminiVeoProvider());
    this.register(new GrokImagineProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(adapter: AIProviderAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  public get(id: string): AIProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      // Fallback to mock adapter if specified is not found
      return this.adapters.get('mock')!;
    }
    return adapter;
  }

  public async getAllStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];
    for (const adapter of this.adapters.values()) {
      try {
        const s = await adapter.getStatus();
        statuses.push(s);
      } catch (err: any) {
        statuses.push({
          providerId: adapter.id,
          name: adapter.name,
          isAvailable: false,
          statusMessage: err.message || 'Status check failed',
          supportedTypes: [],
          supportedModels: []
        });
      }
    }
    return statuses;
  }
}
