import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { ProfilePage } from "@/features/profile/components/profile-page";
import { profileService } from "@/features/profile/service";

export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const data = await profileService.getProfile(tenantId);
  return <ProfilePage initialData={data} />;
}
