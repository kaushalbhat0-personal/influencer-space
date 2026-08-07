import { ContentContainer, PageHeader } from "@/components/layout";
import { NotificationsClient } from "./_components/notifications-client";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <ContentContainer>
      <PageHeader
        title="Notifications"
        description="Your in-app notifications and preferences"
        breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Notifications" }]}
      />
      <NotificationsClient />
    </ContentContainer>
  );
}
