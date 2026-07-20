# ADR-0004: Rendering Adapter Pattern

## Status
Accepted

## Context
The RenderingEngine produces a `RenderResult` (structured data with module slots, tokens, diagnostics). This result must be consumed by multiple frameworks and output formats — React Server Components, React Client Components, REST JSON, HTML email, PDF, embeddable widgets. Without a consistent pattern, each consumer would write its own transformation logic.

## Decision
Rendering adapters follow the `IRenderAdapter<TOutput>` interface:
- `render(result: RenderResult): Promise<TOutput>`
- `supportsStreaming(): boolean`
- `getContentType(): string`

Each adapter is tied to a `SurfaceId` and produces a typed output:
- `ReactServerAdapter` → `{ html, head, scripts, styles }`
- `ReactClientAdapter` → `{ slots[], tokens, theme }`
- `RestAdapter` → `{ ok, data[], meta }`
- `EmailAdapter` → `{ subject, html, text }`
- `PdfAdapter` → `{ html, metadata }`
- `WidgetAdapter` → `{ html, script, styles, metadata }`

## Consequences
- **Positive:** Framework-agnostic rendering engine. New output formats don't require engine changes. Mobile, desktop, and CLI adapters follow the same pattern.
- **Negative:** Adapter surface must be maintained for each new framework.
- **Mitigations:** Adapters are thin (~50 lines each). New adapters are trivial to add.
