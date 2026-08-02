# Theme Metadata Schema — IMPLEMENTATION-25

Every theme is a `ThemeDefinition` (unchanged shape, plus the new `tier` and
`recommended` fields).

## Fields

| Field | Example |
|---|---|
| `id` | `com.creatos.creator-gold` |
| `slug` | `creator-gold` |
| `name` | `Creator Gold` |
| `description` | curated 1–2 line value prop |
| `author` | CreatorOS |
| `version` | `1.0.0` |
| `category` | `ThemeCategory` |
| `tags` | `["gold", "luxury", "dark", "premium"]` |
| `tier` (NEW) | `free \| starter \| pro \| business \| enterprise` |
| `premium` | derived from tier (`tier !== "free"`) |
| `recommended` (NEW) | curated recommendation flag |
| `featured` | marketplace home highlight |
| `industries` | `["creator", "luxury & lifestyle"]` |
| `supportedBlueprints` | blueprint ids it works with |
| `minimumPlatformVersion` / `requiredCapabilities` | gating metadata |
| `releaseDate` / `updatedAt` | ISO dates (drives Newest/Updated sort) |
| `rating` | 0–5 marketplace rating |
| `colorSwatches` | up to 6 preview colors |
| `previewImage` / `thumbnail` / `coverImage` | preview assets |
| `variants` | light/dark `ThemeDesignTokens` (colors, typography, spacing, radius, elevation, motion, borders) |

## No duplicated styling logic

Metadata is data only. Rendering, runtime and application use the single
existing Theme Engine / tokens / CSS variables. Adding a theme is one
configuration entry; no code changes.
