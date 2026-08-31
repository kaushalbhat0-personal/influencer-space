// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";

// RCCF-71.4.1 P1 — fresh Creator login visually "returned to /admin/login"
// even though the credentials POST returned 200 and the session cookie was
// issued. Root cause: LoginForm used a client-side `router.push("/admin/dashboard")`
// immediately after signIn resolved; when the target route (or /onboarding for
// a fresh account) needed its first-ever on-demand compile, the App Router
// client aborted the soft RSC navigation (net::ERR_ABORTED) and the page
// reverted to /admin/login. A full document navigation
// (`window.location.href`) waits server-side for the compile and re-enters
// through middleware with the fresh cookie — the same path a manual reload
// takes.
//
// Guardrails pinned here:
//   CORRECT: window.location.href = "/admin/dashboard" on signIn success.
//   WRONG:   router.push("/admin/dashboard") must be ABSENT.
//   PRESERVED: signIn("credentials", { redirect: false }) + the error-path
//     router.push("/admin/login?error=CredentialsSignin").

const h = vi.hoisted(() => {
  const hoisted = {
    mockSignIn: vi.fn(),
    mockPush: vi.fn(),
    mockSearchParams: vi.fn(),
    assigned: [] as string[],
    reset: () => {
      hoisted.mockSignIn.mockReset();
      hoisted.mockPush.mockReset();
      hoisted.assigned.length = 0;
      hoisted.mockSearchParams.mockReturnValue(null);
      hoisted.mockSignIn.mockResolvedValue({ error: null });
    },
  };
  return hoisted;
});

vi.mock("next-auth/react", () => ({ signIn: h.mockSignIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: h.mockPush }),
  useSearchParams: () => ({ get: (k: string) => h.mockSearchParams(k) }),
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  h.reset();
  // Stub the full-document navigation sink so the component under test never
  // actually leaves the page; capture the assigned URL.
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: "",
      assign: (u: string) => { (window.location as { href: string }).href = u; },
    },
  });
});

async function fillAndSubmit(email: string, password: string) {
  render(<LoginForm />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await waitFor(() => expect(h.mockSignIn).toHaveBeenCalledTimes(1));
}

import { LoginForm } from "@/components/admin/LoginForm";

describe("RCCF-71.4.1 P1 — login continuation survives the cold-compile navigation race", () => {
  it("navigates with a FULL document load on successful sign-in", async () => {
    h.mockSignIn.mockResolvedValue({ error: null });
    await fillAndSubmit("creator@example.com", "Rccf714Qa!2026");

    expect(h.mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
      email: "creator@example.com",
      password: "Rccf714Qa!2026",
      redirect: false,
    }));

    // CORRECT token: a full page navigation that waits server-side.
    expect((window.location as { href: string }).href).toBe("/admin/dashboard");

    // WRONG token: no client-side soft navigation that the App Router could
    // abort during an on-demand route compile.
    expect(h.mockPush).not.toHaveBeenCalledWith("/admin/dashboard");
  });

  it("keeps the visible error path on sign-in failure (soft push to the login page)", async () => {
    h.mockSignIn.mockResolvedValue({ error: "CredentialsSignin" });
    await fillAndSubmit("bad@example.com", "wrong");

    expect(h.mockPush).toHaveBeenCalledWith("/admin/login?error=CredentialsSignin");
    // No full navigation on failure.
    expect((window.location as { href: string }).href).toBe("");
  });
});

describe("RCCF-71.4.1 P1 — source-level guardrails (correct token present, wrong token absent)", () => {
  it("LoginForm uses window.location.href for the dashboard and never router.push('/admin/dashboard')", () => {
    const src = readFileSync("src/components/admin/LoginForm.tsx", "utf8");
    expect(src).toContain('window.location.href = "/admin/dashboard"');
    expect(src).not.toContain('router.push("/admin/dashboard")');
  });

  it("preserves redirect:false sign-in and the error-path soft navigation", () => {
    const src = readFileSync("src/components/admin/LoginForm.tsx", "utf8");
    expect(src).toContain('signIn("credentials"');
    expect(src).toContain("redirect: false");
    expect(src).toContain('router.push("/admin/login?error=CredentialsSignin")');
  });
});
