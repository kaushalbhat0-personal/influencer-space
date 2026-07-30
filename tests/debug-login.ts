const BASE = "http://localhost:3000";

async function main() {
  // Step 1: Get CSRF from signin page
  const signin = await fetch(BASE + "/api/auth/signin");
  const html = await signin.text();
  const match = html.match(/name="csrfToken".*?value="([^"]+)"/);
  const csrfToken = match ? match[1] : "";
  console.log("CSRF from signin:", csrfToken ? csrfToken.substring(0, 20) + "..." : "NOT FOUND");

  // Step 2: Login
  const r = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: "/super-admin", email: "admin@creatorstore.test", password: "admin123" }).toString(),
    redirect: "manual",
  });
  console.log("Login status:", r.status);
  console.log("Location:", r.headers.get("location"));
  const setCookie = r.headers.get("set-cookie") || "";
  if (setCookie.includes("session-token")) {
    console.log("✅ SESSION COOKIE FOUND!");
    const m = setCookie.match(/next-auth\.session-token=([^;]+)/);
    console.log("Token:", m ? m[1].substring(0, 40) : "no match");
  } else {
    console.log("❌ No session cookie");
    console.log("Cookies:", setCookie.substring(0, 300));

    // Follow redirect
    const loc = r.headers.get("location");
    if (loc) {
      const r2 = await fetch(loc, { redirect: "manual" });
      console.log("Redirect status:", r2.status);
      const r2c = r2.headers.get("set-cookie") || "";
      console.log("Redirect cookies:", r2c.substring(0, 200));
    }

    // Check session
    const session = await fetch(BASE + "/api/auth/session");
    const s = await session.json();
    console.log("Session:", JSON.stringify(s));
  }
}
main();
