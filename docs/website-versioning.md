# Website Versioning

RCCF-EPIC-09 · Phase 3.

`src/modules/website-evolution/application/versioning.ts`

Tracks the version landscape of a creator's website so evolution history has
context.

```ts
interface WebsiteVersionInfo {
  currentVersion: number | null;     // latest live publish
  previousVersion: number | null;    // second-latest live publish
  generatedVersion: number | null;   // first publish (the onboarding generation)
  builderVersion: number | null;     // the builder's latest published version
  blueprint: string | null;          // provisioning template id
  experience: string | null;         // resolved Experience id
  publishedAt: string | null;
  evolutionHistoryLength: number;
}
```

- **Generated Version** = the first live snapshot (what onboarding produced).
- **Current / Previous** = the latest two live publish snapshots.
- **Builder Version** = the latest live version (the builder's output).
- **Blueprint / Experience** = the template + resolved experience used.

Version info is read-only and shown alongside the evolution feed, giving the
creator and Super Admin a sense of how far the website has come from its first
generation.
