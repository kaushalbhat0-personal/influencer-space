const BASE = "http://localhost:3000";

async function main() {
  // Get CSRF via the built-in csrf endpoint
  const csrfRes = await fetch(BASE + "/api/auth/csrf");
  const csrfData = await csrfRes.json() as { csrfToken?: string };
  const csrfToken = csrfData.csrfToken || "";
  console.log("CSRF token from csrf endpoint:", csrfToken ? csrfToken.substring(0, 20) + "..." : "MISSING");

  // Also get the CSRF cookie to send
  const csrfCookie = csrfRes.headers.get("set-cookie") || "";
  console.log("CSRF cookie:", csrfCookie.substring(0, 100));

  // Now login — set the CSRF cookie AND send the token
  const loginRes = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie.split(";")[0],
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: "/super-admin",
      email: "admin@creatorstore.test",
      password: "admin123",
    }).toString(),
    redirect: "manual",
  });

  console.log("\nLogin status:", loginRes.status);
  console.log("Location:", loginRes.headers.get("location"));

  const setCookie = loginRes.headers.get("set-cookie") || "";
  if (setCookie.includes("session-token")) {
    console.log("✅ SESSION TOKEN FOUND!");
    const m = setCookie.match(/next-auth\.session-token=([^;]+)/);
    console.log("Token:", m ? m[1].substring(0, 50) : "no match");
  } else {
    console.log("❌ No session token");
    console.log("Cookies:", setCookie.substring(0, 300));
  }
}
main();
