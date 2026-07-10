import { getInfluencerConfig } from "@/config/influencer";
import { ContactFormClient } from "./_components/contact-form-client";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const config = await getInfluencerConfig();

  return <ContactFormClient config={config} />;
}
