import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  // For now, redirect to the existing Provision Modal or generation flow
  redirect("/agency/clients");

  return (
    <ContentContainer>
      <PageHeader title="New Client" description="Create a new client and generate their website." />
    </ContentContainer>
  );
}
