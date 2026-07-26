export interface SettingsData {
  workspaceName: string;
  locale: string;
  timezone: string;
  currency: string;
  language: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  orderUpdates: boolean;
  marketing: boolean;
}

export interface SettingsFormInput {
  workspaceName?: string;
  locale?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  notifications?: NotificationSettings;
}
