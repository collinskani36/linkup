import { supabase } from "@/lib/supabase";
import { normalizeKenyanPhone, normalizeUsername } from "@/lib/auth-utils";

export type AuthErrorCode = "email_not_confirmed" | "generic";

export class AuthError extends Error {
  code: AuthErrorCode;
  email?: string;

  constructor(message: string, code: AuthErrorCode = "generic", email?: string) {
    super(message);
    this.code = code;
    this.email = email;
  }
}

const WRONG_CREDENTIALS = "That username or password doesn’t look right.";

type ErrorLike = { message?: string; status?: number; code?: string };

function friendly(error: ErrorLike, fallback: string): string {
  const message = (error.message ?? "").toLowerCase();
  if (error.status === 429 || message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (message.includes("network") || message.includes("failed to fetch")) {
    return "Can’t reach LinkUp right now. Check your connection and try again.";
  }
  return fallback;
}

const RATE_LIMITED = "Too many attempts. Please wait a minute and try again.";
const SERVER_TROUBLE = "Something went wrong on our side. Please try again in a moment.";

type ApiResult = { status: number; body: Record<string, unknown> };

/** Talks to our own server route (api/auth.js), which looks up emails and handles resets safely. */
async function callAuthApi(action: string, payload: Record<string, unknown>): Promise<ApiResult> {
  let response: Response;
  try {
    response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch {
    throw new AuthError("Can’t reach LinkUp right now. Check your connection and try again.");
  }
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    // Not JSON (for example the route isn't deployed yet): treated as a server problem below.
  }
  return { status: response.status, body };
}

function readSession(value: unknown): { access_token: string; refresh_token: string } | null {
  if (!value || typeof value !== "object") return null;
  const { access_token, refresh_token } = value as Record<string, unknown>;
  return typeof access_token === "string" && typeof refresh_token === "string"
    ? { access_token, refresh_token }
    : null;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", {
    p_username: normalizeUsername(username),
  });
  if (error) throw new AuthError(friendly(error, "Couldn’t check that username."));
  return data === true;
}

export type SignUpInput = {
  name: string;
  username: string;
  age: string;
  email: string;
  phone: string;
  password: string;
};

/** Creates the account and emails a 6-digit code. `needsOtp` is false only if email confirmation is off. */
export async function signUp(input: SignUpInput): Promise<{ needsOtp: boolean }> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        username: normalizeUsername(input.username),
        name: input.name.trim(),
        phone: normalizeKenyanPhone(input.phone),
        age: input.age,
      },
    },
  });

  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (message.includes("database error")) {
      throw new AuthError(
        "That username or phone number is already in use. Try another, or log in.",
      );
    }
    if (message.includes("already registered")) {
      throw new AuthError("An account with this email already exists. Try logging in.");
    }
    if (message.includes("password")) {
      throw new AuthError("That password is too weak. Try a longer one.");
    }
    throw new AuthError(friendly(error, "Couldn’t create your account. Please try again."));
  }

  // For an already-confirmed email Supabase returns a user with no identities (anti-enumeration).
  if (data.user && data.user.identities?.length === 0) {
    throw new AuthError("An account with this email already exists. Try logging in.");
  }
  return { needsOtp: !data.session };
}

export async function verifySignupOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "signup",
  });
  if (error) {
    throw new AuthError(friendly(error, "That code didn’t work. Check it or ask for a new one."));
  }
}

export async function resendSignupOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });
  if (error) throw new AuthError(friendly(error, "Couldn’t send a new code. Try again shortly."));
}

/** Log in with a username or an email address. The username lookup happens on the server. */
export async function signIn(identifier: string, password: string): Promise<void> {
  const { status, body } = await callAuthApi("login", { identifier: identifier.trim(), password });

  if (status === 200) {
    const session = readSession(body.session);
    if (!session) throw new AuthError(SERVER_TROUBLE);
    const { error } = await supabase.auth.setSession(session);
    if (error) throw new AuthError(friendly(error, "Couldn’t log you in. Please try again."));
    return;
  }
  if (status === 403 && body.code === "email_not_confirmed" && typeof body.email === "string") {
    throw new AuthError(
      "Confirm your email first — we’ll send you a new code.",
      "email_not_confirmed",
      body.email,
    );
  }
  if (status === 429) throw new AuthError(RATE_LIMITED);
  if (status === 401 || status === 400) throw new AuthError(WRONG_CREDENTIALS);
  throw new AuthError(SERVER_TROUBLE);
}

/**
 * Emails a 6-digit reset code to the account's email. Always looks the same whether or not the
 * account exists, so nobody can use it to find out who is on LinkUp.
 */
export async function requestPasswordReset(identifier: string): Promise<void> {
  const { status } = await callAuthApi("forgot", { identifier: identifier.trim() });
  if (status === 200) return;
  if (status === 400) throw new AuthError("Enter your username or email.");
  if (status === 429) throw new AuthError(RATE_LIMITED);
  throw new AuthError(SERVER_TROUBLE);
}

export type ResetPasswordInput = { identifier: string; code: string; password: string };

/** Checks the emailed code and sets the new password. The user then logs in as normal. */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const { status, body } = await callAuthApi("reset", {
    identifier: input.identifier.trim(),
    code: input.code.trim(),
    password: input.password,
  });
  if (status === 200) return;
  if (body.code === "invalid_code") {
    throw new AuthError("That code didn’t work. Check it or ask for a new one.");
  }
  if (body.code === "same_password") {
    throw new AuthError(
      "That’s your current password. Ask for a new code and choose a different one.",
    );
  }
  if (body.code === "weak_password") {
    throw new AuthError("That password is too weak. Try a longer one.");
  }
  if (status === 429) throw new AuthError(RATE_LIMITED);
  throw new AuthError(SERVER_TROUBLE);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
