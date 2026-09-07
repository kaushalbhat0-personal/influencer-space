import type { SectionBlueprint } from "./types";
import { CONTACT_EMAIL } from "@/lib/marketing/messaging";

export class ContactComposer {
  compose(slug: string, creatorName: string): SectionBlueprint {
    return {
      id: "section_contact",
      type: "contact_form",
      page: "contact",
      order: 0,
      props: {
        title: "Get In Touch",
        subtitle: `Have a question about ${creatorName}'s products? Send us a message.`,
        email: CONTACT_EMAIL,
        showPhone: true,
        phoneLabel: "Contact",
        showAddress: false,
        formFields: ["name", "email", "subject", "message"],
        submitLabel: "Send Message",
        successMessage: "Thank you! We'll get back to you soon.",
      },
      reason: "Contact form for customer inquiries and collaboration requests",
      confidence: 0.8,
    };
  }
}
