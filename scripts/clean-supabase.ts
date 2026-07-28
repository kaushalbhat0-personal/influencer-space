import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function deleteAll(table: string): Promise<void> {
  process.stdout.write(`Deleting ${table}... `);
  try {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) {
      if (
        error.code === "42P01" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("relation")
      ) {
        console.log("skipped (not found)");
      } else {
        console.log(`error: ${error.message}`);
      }
    } else {
      console.log("ok");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("relation")) {
      console.log("skipped (not found)");
    } else {
      console.log(`error: ${msg}`);
    }
  }
}

async function main() {
  console.log("Finding super admins...");
  const { data: superAdmins, error: fetchError } = await supabase
    .from("User")
    .select("id, email")
    .eq("role", "SUPER_ADMIN");

  if (fetchError) {
    console.error("Failed to fetch super admins:", fetchError);
    process.exit(1);
  }

  console.log(
    `Preserving ${superAdmins.length} super admin(s):`,
    superAdmins.map((u) => u.email).join(", "),
  );

  // Delete in dependency order (children before parents)
  const tables = [
    // Builder
    "Block",
    "Section",
    "Page",
    // Storefront / publishing
    "PublishSnapshot",
    "Brand",
    "PublishStatus",
    "Website",
    // Content
    "TimelineEvent",
    "GalleryImage",
    "Game",
    "AffiliateLink",
    "ContactSubmission",
    "NewsletterSubscriber",
    "SocialStats",
    "ContentFeedItem",
    // Products & orders
    "ProductOrder",
    "Product",
    // Billing v2
    "BillingInvoice",
    "BillingEvent",
    "BillingSubscription",
    "BillingAccount",
    // Legacy billing
    "AgencySubscription",
    "Subscription",
    // Events & audits
    "AnalyticsEvent",
    "AuditLog",
    "PlatformEvent",
    // Generation sessions
    "GenerationSessionEvent",
    "GenerationSessionStage",
    "GenerationSession",
    // Creator intelligence
    "CreatorProvisionEvent",
    "CreatorProvisionRun",
    "CreatorImport",
    "CreatorIntelligence",
    "CreatorProfile",
    "ProviderFetchLog",
    "YouTubeQuotaUsage",
    "ProviderAccount",
    // Workflows
    "WorkflowExecution",
    "Workflow",
    // Settings
    "Setting",
    // Design themes
    "DesignTheme",
    // Assets
    "AssetReference",
    "Asset",
    // Offerings & purchases
    "Purchase",
    "Offering",
    // Workspace
    "WorkspaceMember",
    "Workspace",
    // Agencies
    "AgencyTenant",
    "WebsiteAgency",
    // Tenant (parent of most things)
    "Tenant",
  ];

  for (const table of tables) {
    await deleteAll(table);
  }

  // Delete non-super-admin users last
  process.stdout.write("Deleting non-super-admin Users... ");
  const { error: userDeleteError } = await supabase
    .from("User")
    .delete()
    .neq("role", "SUPER_ADMIN");
  if (userDeleteError) {
    console.log(`error: ${userDeleteError.message}`);
  } else {
    console.log("ok");
  }

  console.log("\nDone. Database cleaned. Super admin(s) preserved.");
}

main().catch((e) => {
  console.error("Clean failed:", e);
  process.exit(1);
});
