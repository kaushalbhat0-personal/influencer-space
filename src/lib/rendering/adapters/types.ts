import type { RenderResult } from "../types";
import type { SurfaceId } from "@/lib/theme/types";

export interface IRenderAdapter<TOutput = unknown> {
  readonly surface: SurfaceId;
  render(result: RenderResult): Promise<TOutput>;
  supportsStreaming(): boolean;
  getContentType(): string;
}
