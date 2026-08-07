// ── Fulfillment — Public API ────────────────────────────────
export {
  ensureFulfillment,
  updateFulfillment,
  saveShippingAddress,
  getShippingAddress,
  generateDownload,
  generateDownloadForOrder,
  resolveDownloadToken,
  listFulfillments,
  getFulfillmentByOrder,
  getFulfillmentHealth,
  DOWNLOAD_TTL_MS,
  DOWNLOAD_LIMIT,
} from "./application/runtime";
export { getFulfillmentStrategy, canTransition, statusLabel } from "./application/strategies";
export type {
  FulfillmentType,
  FulfillmentStatus,
  FulfillmentStrategy,
  FulfillmentView,
  FulfillmentUpdateInput,
  ShippingAddressInput,
} from "./domain/types";
