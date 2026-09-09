/**
 * RCCF-OBS-01 — deployment context for SystemError.
 * Gracefully uses null/unknown locally.
 */

export interface DeploymentContext {
  environment: string;
  deploymentId: string | null;
  commitSha: string | null;
}

export function getDeploymentContext(): DeploymentContext {
  return {
    environment: process.env.NODE_ENV || "development",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
}

// Vercel also exposes VERCEL_ENV (production/preview/development)
export function getVercelEnv(): string | null {
  return process.env.VERCEL_ENV ?? null;
}
