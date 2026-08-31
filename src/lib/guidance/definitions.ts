import type { GuidanceDefinition, HelpArticle } from "./types";

export const CREATOR_GUIDANCE: GuidanceDefinition = {
  id: "creator-walkthrough",
  audience: "creator",
  title: "Welcome to CreatorStore",
  description: "Let's get your website ready. We'll walk you through the important parts — you can skip and come back anytime.",
  steps: [
    { id: "website", title: "Your Website", description: "This is your website workspace. Everything you add here appears on your storefront." },
    { id: "design", title: "Design", description: "Choose how your website looks, including themes, colors, fonts and layout." },
    { id: "content", title: "Content", description: "Add the information your visitors need — about you, your services, products, work and contact details." },
    { id: "social", title: "Social Media", description: "Connect your social profiles so visitors can find you elsewhere." },
    { id: "seo", title: "Get Found on Google", description: "Add a few simple details that help Google and social platforms understand your website." },
    { id: "legal", title: "Legal", description: "Review the starter Privacy Policy, Terms, Refund Policy and Disclaimer for your website." },
    { id: "domain", title: "Domain", description: "Choose the web address people will use to visit your website. Upgrade to use your own domain." },
    { id: "preview", title: "Preview", description: "See your website before making it public." },
    { id: "publish", title: "Publish", description: "When you're happy with it, publish your website so visitors can see it." },
  ],
};

export const AGENCY_GUIDANCE: GuidanceDefinition = {
  id: "agency-walkthrough",
  audience: "agency",
  title: "Welcome to your agency workspace",
  description: "Manage websites for your clients from one place.",
  steps: [
    { id: "clients", title: "Clients", description: "Add or select a client to work on their website." },
    { id: "client-website", title: "Client Website", description: "Open a client's website workspace to manage their content and design." },
    { id: "build", title: "Build", description: "Set up the client's website, including design, content, products, services and navigation." },
    { id: "social", title: "Social Media", description: "Add the social profiles the client wants to show on their website." },
    { id: "seo", title: "Get Found on Google", description: "Help your client add the information people should see when they find the website online." },
    { id: "legal", title: "Legal", description: "Set up the client's starter legal pages and customize them when needed." },
    { id: "domain", title: "Domain", description: "Connect the client's web address when they are ready. The client's website remains their website — your access lets you manage it for them." },
    { id: "preview", title: "Preview", description: "Review the website before publishing." },
    { id: "publish", title: "Publish", description: "Publish the client's website when it is ready." },
  ],
};

export const HELP_ARTICLES: HelpArticle[] = [
  { id: "getting-started", title: "Getting started", description: "Create your first website and understand the dashboard.", keywords: ["start", "begin", "first", "dashboard"] },
  { id: "build", title: "Build my website", description: "Add, remove or rearrange sections visitors see. Click a section to edit.", keywords: ["build", "builder", "sections", "content", "add section", "reorder"] },
  { id: "design", title: "Change my design", description: "Choose the overall look and feel of your website.", keywords: ["design", "theme", "colors", "fonts", "appearance"] },
  { id: "products", title: "Add products", description: "Add products or services so visitors can discover what you offer.", keywords: ["product", "service", "store", "sell"] },
  { id: "social", title: "Add social media", description: "Add links to Instagram, YouTube, X and other profiles.", keywords: ["social", "instagram", "youtube", "x", "twitter", "linkedin"] },
  { id: "google", title: "Get found on Google", description: "Add your website name and description so Google can understand your site.", keywords: ["google", "search", "appear on google", "get found", "seo", "found", "description"] },
  { id: "legal", title: "Legal pages", description: "Edit your Privacy Policy, Terms, Refund Policy and Disclaimer.", keywords: ["legal", "privacy", "terms", "refund", "disclaimer"] },
  { id: "domain", title: "Connect your domain", description: "Choose the web address people use to visit your website. Example: yourname.com.", keywords: ["domain", "website address", "web address", "custom domain", "url"] },
  { id: "preview", title: "Preview my website", description: "See your website as visitors will see it before publishing.", keywords: ["preview", "see website", "see", "draft"] },
  { id: "publish", title: "Publish my website", description: "Make your saved changes visible to visitors. Your website is ready to go live.", keywords: ["publish", "make live", "go live", "live"] },
  { id: "clients", title: "Manage clients", description: "Add, open and manage websites for your clients. The client's website remains their website.", keywords: ["client", "customer", "client website", "manage", "agency", "freelancer"] },
  { id: "handoff", title: "Hand over to client", description: "Your client can log in anytime. You can revoke access when they are ready to manage it themselves.", keywords: ["handoff", "revoke", "access", "owner"] },
];
