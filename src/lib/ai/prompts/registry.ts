import type { LlmMessage } from "../providers/interface";

export interface PromptEntry {
  id: string;
  version: string;
  description: string;
  build: (profile: {
    name: string;
    description: string;
    followers: number;
    videoCount: number;
    viewCount: number;
    keywords: string[];
    platform: string;
    latestContent: { title: string; description: string }[];
  }) => { version: string; messages: LlmMessage[] };
}

export class PromptRegistry {
  private prompts = new Map<string, PromptEntry[]>();

  register(entry: PromptEntry): void {
    if (!this.prompts.has(entry.id)) this.prompts.set(entry.id, []);
    this.prompts.get(entry.id)!.push(entry);
  }

  getLatest(id: string): PromptEntry | undefined {
    const versions = this.prompts.get(id);
    if (!versions || versions.length === 0) return undefined;
    return versions[versions.length - 1];
  }

  getVersion(id: string, version: string): PromptEntry | undefined {
    return this.prompts.get(id)?.find((p) => p.version === version);
  }

  getAllVersions(id: string): PromptEntry[] {
    return this.prompts.get(id) || [];
  }
}

export const promptRegistry = new PromptRegistry();
