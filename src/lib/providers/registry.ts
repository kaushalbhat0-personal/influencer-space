import type { CreatorProvider } from "./interface";
import { YouTubeProvider } from "./youtube/provider";

const providers: CreatorProvider[] = [
  new YouTubeProvider(),
];

export class ProviderRegistry {
  resolve(url: string): CreatorProvider {
    for (const provider of providers) {
      if (provider.canHandle(url)) {
        return provider;
      }
    }
    throw new Error(`No provider found for URL: ${url}`);
  }

  getAll(): CreatorProvider[] {
    return providers;
  }

  getByName(name: string): CreatorProvider | undefined {
    return providers.find((p) => p.name === name);
  }
}

export const providerRegistry = new ProviderRegistry();
