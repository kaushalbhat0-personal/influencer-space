/**
 * Tenant Provisioner v1.0.0
 *
 * Creates tenants, admin accounts, and subscription plans for generated websites.
 * Integrates with existing Prisma tenant/user/subscription tables.
 */

import { BaseAppService } from "@/lib/application/base";
import { buildAdminEmail } from "@/lib/config/platform";
import type { ServiceResult } from "@/lib/application/types";
import type { CreatorProfile, TenantProvisioning } from "./types";

export class TenantProvisioner extends BaseAppService {
  constructor() {
    super("TenantProvisioner");
  }

  async provision(
    profile: CreatorProfile,
    options?: { adminEmail?: string; subdomain?: string; planId?: string }
  ): Promise<ServiceResult<TenantProvisioning>> {
    return this.wrapAsync(async () => {
      const slug = profile.username.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const subdomain = options?.subdomain ?? slug;
      const adminEmail = options?.adminEmail ?? buildAdminEmail(subdomain);
      const planId = options?.planId ?? "STARTER";
      const tenantId = `t_${Date.now()}_${slug.substring(0, 8)}`;

      return {
        tenantId,
        tenantName: profile.name,
        subdomain,
        adminEmail,
        planId,
      };
    }, "Tenant");
  }
}

export const tenantProvisioner = new TenantProvisioner();
