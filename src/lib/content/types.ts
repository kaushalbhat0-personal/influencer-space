export type ContentEntityType = string;

export type ContentStatus = "draft" | "published" | "archived" | "deleted";

export type ContentVisibility = "public" | "private" | "unlisted";

export interface ContentEntity {
  id: string;
  type: ContentEntityType;
  tenantId: string;
  slug: string;
  status: ContentStatus;
  visibility: ContentVisibility;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentEntityCapabilities {
  creatable: boolean;
  updatable: boolean;
  deletable: boolean;
  archivable: boolean;
  restorable: boolean;
  duplicatable: boolean;
  publishable: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
}

export interface ContentEntityRegistration {
  type: ContentEntityType;
  displayName: string;
  icon: string;
  category: string;
  capabilities: ContentEntityCapabilities;
  validationSchema: Record<string, unknown>;
  defaultData: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface ContentQuery {
  tenantId?: string;
  type?: ContentEntityType;
  status?: ContentStatus;
  visibility?: ContentVisibility;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ContentCommand {
  name: string;
  type: ContentEntityType;
  input: Record<string, unknown>;
}

export interface ContentCommandResult {
  success: boolean;
  commandId: string;
  commandName: string;
  entityId: string | null;
  data: unknown;
  error: string | null;
}

export interface ContentDiagnostics {
  registeredTypes: number;
  entityCounts: Record<string, number>;
  commandCount: number;
  queryCount: number;
  eventCount: number;
  errors: string[];
}

export interface ContentValidationResult {
  valid: boolean;
  errors: { field: string; message: string }[];
}

export interface ContentPolicyContext {
  tenantId: string;
  entityType: string;
  entityId: string | null;
  role: string;
  plan: string;
}

export type ContentPolicyFn = (ctx: ContentPolicyContext) => { allowed: boolean; reason?: string };
