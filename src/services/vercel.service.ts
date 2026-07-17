export interface VercelDomainResult {
  success: boolean;
  domain: string;
  error?: string;
  vercelResponse?: unknown;
}

export interface VercelVerificationRecord {
  type: string;
  domain: string;
  value: string;
}

export interface VercelDomainStatus {
  domain: string;
  verified: boolean;
  verification?: VercelVerificationRecord[];
  vercelResponse?: unknown;
  error?: string;
}

async function withCredentials() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    throw new Error("VERCEL_API_TOKEN or VERCEL_PROJECT_ID not configured");
  }
  return { token, projectId };
}

export const VercelService = {
  async addDomain(domain: string): Promise<VercelDomainResult> {
    const cleaned = domain
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "")
      .toLowerCase();

    try {
      const { token, projectId } = await withCredentials();

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

  async getDomainStatus(domain: string): Promise<VercelDomainStatus> {
    const cleaned = domain.toLowerCase();

    try {
      const { token, projectId } = await withCredentials();

      const res = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${cleaned}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();

      if (!res.ok) {
        return {
          domain: cleaned,
          verified: false,
          error: data?.error?.message || `Vercel API returned ${res.status}`,
          vercelResponse: data,
        };
      }

      const verification = data?.verification?.map(
        (v: { type: string; domain: string; value: string }) => ({
          type: v.type,
          domain: v.domain,
          value: v.value,
        }),
      ) as VercelVerificationRecord[] | undefined;

      return {
        domain: cleaned,
        verified: data?.verified === true,
        verification,
        vercelResponse: data,
      };
    } catch (error) {
      return {
        domain: cleaned,
        verified: false,
        error: error instanceof Error ? error.message : "Vercel API call failed",
      };
    }
  },

  async verifyDomain(domain: string): Promise<VercelDomainStatus> {
    const cleaned = domain.toLowerCase();

    try {
      const { token, projectId } = await withCredentials();

      const res = await fetch(
        `https://api.vercel.com/v9/projects/${projectId}/domains/${cleaned}/verify`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();

      if (!res.ok && res.status !== 409) {
        return {
          domain: cleaned,
          verified: false,
          error: data?.error?.message || `Vercel API returned ${res.status}`,
          vercelResponse: data,
        };
      }

      const status = await VercelService.getDomainStatus(cleaned);
      return status;
    } catch (error) {
      return {
        domain: cleaned,
        verified: false,
        error: error instanceof Error ? error.message : "Vercel API call failed",
      };
    }
  },

  async removeDomain(domain: string): Promise<VercelDomainResult> {
    const cleaned = domain.toLowerCase();

    try {
      const { token, projectId } = await withCredentials();

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
