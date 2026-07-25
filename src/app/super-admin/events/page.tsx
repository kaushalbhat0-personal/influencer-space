import { ContentContainer, PageHeader } from "@/components/layout";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEvents, getEventTypes } from "@/actions/operations.actions";
import { EventsClient } from "./_components/events-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") return <p className="text-red-400 p-8">Unauthorized</p>;

  const [events, eventTypes] = await Promise.all([
    getEvents({ limit: 50 }).catch(() => []),
    getEventTypes().catch(() => []),
  ]);

  return (
    <ContentContainer>
      <PageHeader title="Event Explorer" description="Browse platform events across all domains."
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Operations", href: "/super-admin/operations" }, { label: "Events" }]} />
      <EventsClient initialEvents={events} eventTypes={eventTypes} />
    </ContentContainer>
  );
}
