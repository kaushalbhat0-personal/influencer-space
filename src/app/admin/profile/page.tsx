import { requireTenant } from "@/lib/auth/require-tenant";
import { ProfilePage } from "@/features/profile/components/profile-page";
import { profileService } from "@/features/profile/service";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const { tenantId } = await requireTenant();

  const data = await profileService.getProfile(tenantId);
  return <ProfilePage initialData={data} tenantId={tenantId} />;
}
