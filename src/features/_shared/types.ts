export interface FeatureState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface AutosaveOptions {
  intervalMs?: number;
  onError?: (error: unknown) => void;
}

export interface OptimisticUpdate<T> {
  previous: T;
  updated: T;
  timestamp: number;
}

export interface PageMetadata {
  title: string;
  description?: string;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface EmptyStateConfig {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
}
