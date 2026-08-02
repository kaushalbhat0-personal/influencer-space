/**
 * Account Settings — IMPLEMENTATION-18B.
 *
 * Profile is now ACCOUNT settings only. Creator identity (name, tagline, bio,
 * profile picture, social links) is owned by Hero and edited there. Profile no
 * longer writes any storefront-visible identity field.
 */
export interface AccountSettingsData {
  contactEmail: string | null;
  phone: string | null;
  timezone: string | null;
  language: string | null;
  country: string | null;
  location: string | null;
  businessName: string | null;
  gst: string | null;
  taxId: string | null;
  payoutPreference: string | null;
  currency: string | null;
  categories: string[];
  notifications: { email: boolean; push: boolean };
}

export interface AccountSettingsUpdateInput {
  contactEmail?: string | null;
  phone?: string | null;
  timezone?: string | null;
  language?: string | null;
  country?: string | null;
  location?: string | null;
  businessName?: string | null;
  gst?: string | null;
  taxId?: string | null;
  payoutPreference?: string | null;
  currency?: string | null;
  categories?: string[];
  notifications?: { email: boolean; push: boolean };
}
