import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Agency console lives at /agency (root = dashboard). CRITICAL-02 restore. */
export default function AgencyDashboardRedirect() {
  redirect("/agency");
}
