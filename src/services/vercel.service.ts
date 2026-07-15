export interface VercelDomainResult {
  success: boolean;
  domain: string;
  error?: string;
  vercelResponse?: unknown;
}

export const VercelService = {
  async addDomain(domain: string): Promise<VercelDomainResult> {
    const token = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token || !projectId) {
      return { success: false, domain, error: "VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured" };
    }

    const cleaned = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    try {
      const res = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/domains`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: cleaned }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        const message =
          data?.error?.message ||
          data?.error?.code ||
          `Vercel API returned ${res.status}`;
        return { success: false, domain: cleaned, error: message, vercelResponse: data };
      }

      return { success: true, domain: cleaned, vercelResponse: data };
    } catch (error) {
      return {
        success: false,
        domain: cleaned,
        error: error instanceof Error ? error.message : "Vercel API call failed",
      };
    }
  },

  async removeDomain(domain: string): Promise<VercelDomainResult> {
    const token = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;

    if (!token || !projectId) {
      return { success: false, domain, error: "VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured" };
    }

    const cleaned = domain.toLowerCase();

    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${cleaned}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const data = await res.json();
        const message = data?.error?.message || `Vercel API returned ${res.status}`;
        return { success: false, domain: cleaned, error: message };
      }

      return { success: true, domain: cleaned };
    } catch (error) {
      return {
        success: false,
        domain: cleaned,
        error: error instanceof Error ? error.message : "Vercel API call failed",
      };
    }
  },
};
