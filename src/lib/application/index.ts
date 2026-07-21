/**
 * Application Service Layer v1.0.0
 *
 * The SINGLE orchestration boundary between UI and Platform.
 * All React components, hooks, and server actions MUST go through
 * these services. No direct Prisma or Platform API access from UI.
 */

export { BaseAppService } from "./base";

export {
  ApplicationError,
  ApplicationErrorCode,
  NotFoundError,
  ValidationError,
  PermissionError,
  LimitExceededError,
  InfrastructureError,
  normalizeError,
} from "./errors";

export type { ServiceResult, PaginatedResult, CommandResult } from "./types";

export type {
  ProductDTO,
  CreateProductDTO,
  UpdateProductDTO,
  ProductQueryDTO,
  ProductStatsDTO,
} from "./dtos/products";

export type {
  GalleryDTO,
  GalleryMediaDTO,
  CreateGalleryDTO,
  UpdateGalleryDTO,
  GalleryQueryDTO,
} from "./dtos/gallery";

export type { DashboardStatsDTO, DashboardQuickActionDTO } from "./dtos/dashboard";

export type { ContentCommandService, ContentQueryService } from "./content-app.service";
export { ContentApplicationService, contentAppService } from "./content-app.service";
export { DashboardApplicationService, dashboardAppService } from "./dashboard-app.service";
