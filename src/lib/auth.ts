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

/** Log in with a username or an email address. */
export async function signIn(identifier: string, password: string): Promise<void> {
  let email = identifier.trim();

  if (!email.includes("@")) {
    const { data, error } = await supabase.rpc("get_login_email", {
      p_username: normalizeUsername(email),
    });
    if (error) throw new AuthError(friendly(error, WRONG_CREDENTIALS));
    if (!data) throw new AuthError(WRONG_CREDENTIALS);
    email = data as string;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = (error.message ?? "").toLowerCase();
    if (error.code === "email_not_confirmed" || message.includes("not confirmed")) {
      throw new AuthError(
        "Confirm your email first — we’ll send you a new code.",
        "email_not_confirmed",
        email,
      );
    }
    throw new AuthError(friendly(error, WRONG_CREDENTIALS));
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
