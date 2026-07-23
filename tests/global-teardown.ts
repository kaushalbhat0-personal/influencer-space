async function globalTeardown() {
  console.log("🧹 E2E test suite complete — cleanup handled by globalSetup on next run");
}

export default globalTeardown;
