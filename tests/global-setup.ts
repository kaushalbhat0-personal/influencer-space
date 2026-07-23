async function globalSetup() {
  const baseURL = "http://localhost:3000";
  const maxRetries = 15;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${baseURL}/api/dev/seed`, { method: "POST" });
      const body = await response.json();
      if (body.ok) {
        console.log("✅ Database seeded for E2E tests");
        return;
      }
      throw new Error(body.error || "Seed failed");
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`⏳ Waiting for server... (${i + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export default globalSetup;
