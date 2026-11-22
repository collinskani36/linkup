// Server-side auth for LinkUp: log in with a username, and reset a forgotten password.
//
// Why this exists: a username has to be turned into an email before Supabase can log someone
// in. Doing that lookup in the browser meant anyone could harvest every member's email, so the
// lookup now happens here and the email never reaches the browser. The recovery session also
// stays on the server, so the app never briefly "logs in" a user who hasn't set a new password.
//
// POST /api/auth   { action: "login" | "forgot" | "reset", ... }
//   login  { identifier, password }        -> { session: { access_token, refresh_token } }
//   forgot { identifier }                  -> { ok: true }   (always, so accounts can't be probed)
//   reset  { identifier, code, password }  -> { ok: true }
//
// Environment variables (Vercel -> Settings -> Environment Variables, Production + Preview):
//   VITE_SUPABASE_URL      already set for the app (SUPABASE_URL also works)
//   SUPABASE_SECRET_KEY    NEW. Server only: never give it a VITE_ prefix, never put it in the app.
//
// Also turn on Supabase -> Authentication -> Rate Limits -> "IP Address Forwarding". Without it
// every member's login looks like it comes from one Vercel IP and shares one rate limit.

import { createClient } from "@supabase/supabase-js";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CODE_RE = /^\d{6}$/;
const MIN_PASSWORD = 8;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req) {
  const raw = req.body;
  if (raw && typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** The real visitor's IP. Vercel sets these headers itself, so a visitor can't fake them. */
function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real) return real.trim();
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return "";
}

function makeClient(url, secret, ip) {
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: ip ? { "sb-forwarded-for": ip } : {} },
  });
}

const isText = (value, max) => typeof value === "string" && value.length > 0 && value.length <= max;
const isRateLimited = (error) =>
  error?.status === 429 || String(error?.code ?? "").startsWith("over_");

/** Username or email in, email out (or null). Never throws. */
async function resolveEmail(client, identifier) {
  const value = identifier.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return EMAIL_RE.test(email) ? email : null;
  }
  const username = value.toLowerCase();
  if (!USERNAME_RE.test(username)) return null;
  const { data, error } = await client.rpc("get_login_email", { p_username: username });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}

async function login(client, body, res) {
  if (!isText(body.identifier, 254) || !isText(body.password, 1000)) {
    return send(res, 400, { code: "invalid_request" });
  }
  const email = await resolveEmail(client, body.identifier);
  if (!email) return send(res, 401, { code: "invalid_credentials" });

  const { data, error } = await client.auth.signInWithPassword({ email, password: body.password });
  if (error) {
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message ?? "")) {
      // Supabase only says this once the password was right, so the email is safe to hand back.
      return send(res, 403, { code: "email_not_confirmed", email });
    }
    if (isRateLimited(error)) return send(res, 429, { code: "rate_limited" });
    if (error.status >= 500) return send(res, 502, { code: "unavailable" });
    return send(res, 401, { code: "invalid_credentials" });
  }
  const session = data?.session;
  if (!session) return send(res, 502, { code: "unavailable" });
  return send(res, 200, {
    session: { access_token: session.access_token, refresh_token: session.refresh_token },
  });
}

async function forgot(client, body, res) {
  if (!isText(body.identifier, 254)) return send(res, 400, { code: "invalid_request" });
  const email = await resolveEmail(client, body.identifier);
  if (email) {
    const { error } = await client.auth.resetPasswordForEmail(email);
    // Deliberately not shown to the visitor (it would reveal which accounts exist),
    // but it lands in the Vercel logs so a broken email setup is easy to spot.
    if (error) console.error("auth/forgot: could not send reset email", error.code ?? error.status);
  }
  return send(res, 200, { ok: true });
}

async function reset(client, body, res) {
  if (!isText(body.identifier, 254) || !isText(body.code, 12) || !isText(body.password, 1000)) {
    return send(res, 400, { code: "invalid_request" });
  }
  if (!CODE_RE.test(body.code.trim())) return send(res, 400, { code: "invalid_code" });
  if (body.password.length < MIN_PASSWORD) return send(res, 400, { code: "weak_password" });

  const email = await resolveEmail(client, body.identifier);
  if (!email) return send(res, 400, { code: "invalid_code" });

  const verified = await client.auth.verifyOtp({
    email,
    token: body.code.trim(),
    type: "recovery",
  });
  if (verified.error || !verified.data?.session) {
    if (isRateLimited(verified.error)) return send(res, 429, { code: "rate_limited" });
    return send(res, 400, { code: "invalid_code" });
  }

  const updated = await client.auth.updateUser({ password: body.password });
  if (updated.error) {
    if (updated.error.code === "same_password") return send(res, 400, { code: "same_password" });
    if (updated.error.code === "weak_password" || updated.error.status === 422) {
      return send(res, 400, { code: "weak_password" });
    }
    return send(res, 502, { code: "unavailable" });
  }

  // A password reset should log the account out everywhere, including the temporary
  // recovery session used above.
  await client.auth.signOut({ scope: "global" }).catch(() => undefined);
  return send(res, 200, { ok: true });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { code: "method_not_allowed" });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error("auth: SUPABASE_SECRET_KEY or the Supabase URL is not set on the server");
    return send(res, 503, { code: "unavailable" });
  }

  const body = readBody(req);
  const client = makeClient(url, secret, clientIp(req));

  try {
    if (body.action === "login") return await login(client, body, res);
    if (body.action === "forgot") return await forgot(client, body, res);
    if (body.action === "reset") return await reset(client, body, res);
    return send(res, 400, { code: "invalid_request" });
  } catch (error) {
    console.error("auth: unexpected error", error?.name ?? "Error");
    return send(res, 502, { code: "unavailable" });
  }
}
