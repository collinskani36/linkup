import { beforeEach, describe, expect, it, vi } from "vitest";

// Plain JavaScript serverless function (Vercel), so it has no type declarations.
// @ts-expect-error -- api/auth.js is not part of the TypeScript project
import handler from "../../api/auth.js";

const supa = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => {
    supa.createClient(...args);
    return {
      rpc: supa.rpc,
      auth: {
        signInWithPassword: supa.signInWithPassword,
        resetPasswordForEmail: supa.resetPasswordForEmail,
        verifyOtp: supa.verifyOtp,
        updateUser: supa.updateUser,
        signOut: supa.signOut,
      },
    };
  },
}));

type Reply = { status: number; body: Record<string, unknown> };

async function call(
  body: unknown,
  options: { method?: string; headers?: Record<string, string> } = {},
): Promise<Reply> {
  const reply: Reply = { status: 0, body: {} };
  const res = {
    statusCode: 0,
    setHeader: () => undefined,
    end: (text: string) => {
      reply.status = res.statusCode;
      reply.body = text ? JSON.parse(text) : {};
    },
  };
  await handler({ method: options.method ?? "POST", headers: options.headers ?? {}, body }, res);
  return reply;
}

const session = { access_token: "access-1", refresh_token: "refresh-1" };

describe("api/auth", () => {
  beforeEach(() => {
    Object.values(supa).forEach((fn) => fn.mockReset());
    process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    supa.rpc.mockResolvedValue({ data: "wanjiku@example.com", error: null });
    supa.signOut.mockResolvedValue({ error: null });
  });

  it("only accepts POST", async () => {
    expect((await call({}, { method: "GET" })).status).toBe(405);
  });

  it("says it is unavailable when the secret key is missing", async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    const reply = await call({ action: "login", identifier: "a_b", password: "x" });
    expect(reply.status).toBe(503);
  });

  it("forwards the visitor's IP so rate limits stay per person", async () => {
    supa.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    await call(
      { action: "login", identifier: "wanjiku_m", password: "supersecret" },
      { headers: { "x-real-ip": "41.80.1.2" } },
    );
    expect(supa.createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_secret_test",
      expect.objectContaining({ global: { headers: { "sb-forwarded-for": "41.80.1.2" } } }),
    );
  });

  describe("login", () => {
    it("turns a username into an email on the server and never returns the email", async () => {
      supa.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
      const reply = await call({
        action: "login",
        identifier: " Wanjiku_M ",
        password: "supersecret",
      });

      expect(supa.rpc).toHaveBeenCalledWith("get_login_email", { p_username: "wanjiku_m" });
      expect(supa.signInWithPassword).toHaveBeenCalledWith({
        email: "wanjiku@example.com",
        password: "supersecret",
      });
      expect(reply.status).toBe(200);
      expect(reply.body).toEqual({ session });
    });

    it("skips the lookup when an email is typed", async () => {
      supa.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
      await call({ action: "login", identifier: "Wanjiku@Example.com", password: "supersecret" });
      expect(supa.rpc).not.toHaveBeenCalled();
      expect(supa.signInWithPassword).toHaveBeenCalledWith({
        email: "wanjiku@example.com",
        password: "supersecret",
      });
    });

    it("gives the same answer for an unknown username and a wrong password", async () => {
      supa.rpc.mockResolvedValue({ data: null, error: null });
      const unknown = await call({
        action: "login",
        identifier: "nobody_here",
        password: "x1234567",
      });
      expect(unknown).toEqual({ status: 401, body: { code: "invalid_credentials" } });
      expect(supa.signInWithPassword).not.toHaveBeenCalled();

      supa.rpc.mockResolvedValue({ data: "wanjiku@example.com", error: null });
      supa.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" },
      });
      const wrong = await call({
        action: "login",
        identifier: "wanjiku_m",
        password: "wrongpass1",
      });
      expect(wrong).toEqual(unknown);
    });

    it("hands back the email only when the account just needs confirming", async () => {
      supa.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { code: "email_not_confirmed", status: 400, message: "Email not confirmed" },
      });
      const reply = await call({
        action: "login",
        identifier: "wanjiku_m",
        password: "supersecret",
      });
      expect(reply).toEqual({
        status: 403,
        body: { code: "email_not_confirmed", email: "wanjiku@example.com" },
      });
    });

    it("reports rate limiting", async () => {
      supa.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { code: "over_request_rate_limit", status: 429, message: "slow down" },
      });
      const reply = await call({
        action: "login",
        identifier: "wanjiku_m",
        password: "supersecret",
      });
      expect(reply.status).toBe(429);
    });
  });

  describe("forgot", () => {
    it("sends a reset email for a known account", async () => {
      supa.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      const reply = await call({ action: "forgot", identifier: "wanjiku_m" });
      expect(supa.resetPasswordForEmail).toHaveBeenCalledWith("wanjiku@example.com");
      expect(reply).toEqual({ status: 200, body: { ok: true } });
    });

    it("answers exactly the same for an unknown username, and sends nothing", async () => {
      supa.rpc.mockResolvedValue({ data: null, error: null });
      const reply = await call({ action: "forgot", identifier: "nobody_here" });
      expect(supa.resetPasswordForEmail).not.toHaveBeenCalled();
      expect(reply).toEqual({ status: 200, body: { ok: true } });
    });

    it("still answers ok when the email provider fails", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      supa.resetPasswordForEmail.mockResolvedValue({ data: null, error: { status: 500 } });
      const reply = await call({ action: "forgot", identifier: "wanjiku@example.com" });
      expect(reply).toEqual({ status: 200, body: { ok: true } });
      spy.mockRestore();
    });
  });

  describe("reset", () => {
    const valid = {
      action: "reset",
      identifier: "wanjiku_m",
      code: "123456",
      password: "brandnewpass",
    };

    it("verifies the code, sets the password and signs out everywhere", async () => {
      supa.verifyOtp.mockResolvedValue({ data: { session }, error: null });
      supa.updateUser.mockResolvedValue({ data: {}, error: null });

      const reply = await call(valid);

      expect(supa.verifyOtp).toHaveBeenCalledWith({
        email: "wanjiku@example.com",
        token: "123456",
        type: "recovery",
      });
      expect(supa.updateUser).toHaveBeenCalledWith({ password: "brandnewpass" });
      expect(supa.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(reply).toEqual({ status: 200, body: { ok: true } });
    });

    it("rejects a wrong or expired code without touching the password", async () => {
      supa.verifyOtp.mockResolvedValue({
        data: { session: null },
        error: { code: "otp_expired", status: 403 },
      });
      const reply = await call(valid);
      expect(reply).toEqual({ status: 400, body: { code: "invalid_code" } });
      expect(supa.updateUser).not.toHaveBeenCalled();
    });

    it("rejects malformed codes and short passwords before calling Supabase", async () => {
      expect((await call({ ...valid, code: "12ab56" })).body).toEqual({ code: "invalid_code" });
      expect((await call({ ...valid, password: "short" })).body).toEqual({ code: "weak_password" });
      expect(supa.verifyOtp).not.toHaveBeenCalled();
    });

    it("explains when the new password equals the old one", async () => {
      supa.verifyOtp.mockResolvedValue({ data: { session }, error: null });
      supa.updateUser.mockResolvedValue({
        data: null,
        error: { code: "same_password", status: 422 },
      });
      const reply = await call(valid);
      expect(reply).toEqual({ status: 400, body: { code: "same_password" } });
    });

    it("treats an unknown username like a wrong code", async () => {
      supa.rpc.mockResolvedValue({ data: null, error: null });
      const reply = await call(valid);
      expect(reply).toEqual({ status: 400, body: { code: "invalid_code" } });
      expect(supa.verifyOtp).not.toHaveBeenCalled();
    });
  });
});
