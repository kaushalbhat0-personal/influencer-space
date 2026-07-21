import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { Bot } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AIAssistantPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  return (
    <ContentContainer>
      <PageHeader
        title="AI Assistant"
        description="Ask the AI to help configure your website, generate copy, or suggest improvements."
        breadcrumbs={[{ label: "Grow", href: "/admin/analytics" }, { label: "AI Assistant" }]}
        status={{ label: "Beta", variant: "default" }}
      />
      <div className="admin-card p-6 max-w-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-s8ul-cyan/20 p-2">
            <Bot className="h-5 w-5 text-s8ul-cyan" />
          </div>
          <div>
            <p className="text-sm text-white">
              Hi! I can help you customize your website. Try asking me something like:
            </p>
            <ul className="mt-2 space-y-1">
              {[
                "\"Make my site feel more premium\"",
                "\"Suggest products for my audience\"",
                "\"Improve my SEO metadata\"",
                "\"Change my theme to something darker\"",
              ].map((q) => (
                <li key={q}>
                  <button className="text-sm text-s8ul-cyan hover:underline text-left">{q}</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ContentContainer>
  );
}
