export const WORKSPACE_COOKIE_NAME = "__workspace";
export const WORKSPACE_COOKIE_TTL = 7 * 24 * 60 * 60;

export const WORKSPACE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: WORKSPACE_COOKIE_TTL,
};
