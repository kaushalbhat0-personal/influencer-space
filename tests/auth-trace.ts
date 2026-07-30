const BASE = "http://localhost:3000";

async function trace() {
  console.log("=== AUTH PIPELINE TRACE ===\n");

  // Stage 1: Get CSRF and initial cookies
  console.log("Stage 1: CSRF endpoint");
  const csrfRes = await fetch(BASE + "/api/auth/csrf");
  const csrfData = await csrfRes.json() as { csrfToken?: string };
  console.log("  csrfToken:", csrfData.csrfToken?.substring(0, 30));
  const csrfCookie = (csrfRes.headers.get("set-cookie") || "").split(";")[0];
  console.log("  csrf cookie:", csrfCookie.substring(0, 60));

  // Stage 2: Check for existing session
  console.log("\nStage 2: Check existing session (before login)");
  const beforeSession = await fetch(BASE + "/api/auth/session");
  const beforeData = await beforeSession.json() as Record<string, unknown>;
  console.log("  session:", JSON.stringify(beforeData));

  // Stage 3: Login
  console.log("\nStage 3: Credentials login");
  const loginRes = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookie },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken || "",
      callbackUrl: "/super-admin",
      email: "admin@creatorstore.test",
      password: "admin123",
    }).toString(),
    redirect: "manual",
  });
  console.log("  status:", loginRes.status);
  console.log("  location:", loginRes.headers.get("location"));

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const sessionTokenMatch = setCookie.match(/(__Secure-)?next-auth\.session-token=([^;]+)/);
  const hasSessionCookie = !!sessionTokenMatch;
  console.log("  session token in Set-Cookie:", hasSessionCookie);

  if (sessionTokenMatch) {
    const prefix = sessionTokenMatch[1] || "";
    const token = sessionTokenMatch[2];
    console.log("  token (first 50 chars):", token.substring(0, 50));

    // Decode the JWT payload
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
      console.log("  token payload:", JSON.stringify(payload, null, 2));
    } catch { console.log("  (could not decode JWT)"); }
  }

  // Stage 4: Check session immediately after login
  console.log("\nStage 4: Session check immediately after login");
  const sessionCookie = sessionTokenMatch
    ? (sessionTokenMatch[1] || "") + "next-auth.session-token=" + sessionTokenMatch[2]
    : "";
  const afterSession = await fetch(BASE + "/api/auth/session", {
    headers: sessionCookie ? { Cookie: sessionCookie } : {},
  });
  const afterData = await afterSession.json() as { user?: Record<string, unknown>; expires?: string };
  console.log("  has user:", !!afterData.user);
  if (afterData.user) {
    console.log("  user.id:", afterData.user.id);
    console.log("  user.role:", afterData.user.role);
  } else {
    console.log("  session data:", JSON.stringify(afterData));
  }

  // Stage 5: Verify protected page access
  console.log("\nStage 5: Protected page access");
  const saRes = await fetch(BASE + "/super-admin", {
    headers: sessionCookie ? { Cookie: sessionCookie } : {},
    redirect: "manual",
  });
  console.log("  /super-admin status:", saRes.status);

  // Stage 6: What happens WITHOUT session cookie
  console.log("\nStage 6: Without session cookie");
  const noAuth = await fetch(BASE + "/super-admin", { redirect: "manual" });
  console.log("  /super-admin status:", noAuth.status);
  console.log("  location:", noAuth.headers.get("location"));

  // Stage 7: Delete user test — verify session invalidates
  console.log("\nStage 7: Delete user → session invalidation (simulated)");
  // Check what happens with a non-existent user ID in the session
  const fakeTokenRes = await fetch(BASE + "/api/auth/session");
  const fakeData = await fakeTokenRes.json() as Record<string, unknown>;
  console.log("  anonymous session:", JSON.stringify(fakeData));

  console.log("\n=== TRACE COMPLETE ===");
}

trace().catch(console.error);
