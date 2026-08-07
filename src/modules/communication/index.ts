// ── Communication — Public API ──────────────────────────────
export { COMMUNICATION_REGISTRY, COMMUNICATION_BY_ID } from "./application/registry";
export { renderTemplate, validateTemplate } from "./application/templates";
export { communicationAdapters, getAdapter } from "./application/adapters";
export {
  sendCommunication,
  sendNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteNotification,
  getUnreadCountCached,
  getPreferences,
  setPreference,
  retryFailedCommunications,
  getCommunicationHistory,
  getCommunicationHealth,
  NOTIFICATION_CATEGORIES,
} from "./application/runtime";
export { subscribeCommunicationEvents, handleRuntimeEvent } from "./application/event-wiring";
export type {
  CommunicationChannel,
  CommunicationAudience,
  CommunicationDefinition,
  CommunicationTemplate,
  NotificationView,
  NotificationPriority,
  Recipient,
} from "./domain/types";
