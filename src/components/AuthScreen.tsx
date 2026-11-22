import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowLeft, ArrowUpRight, Loader2, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { LinkUpMark } from "@/components/LinkUpMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import crewPhoto from "@/assets/linkup-crew.jpg";
import {
  AuthError,
  isUsernameAvailable,
  requestPasswordReset,
  resendSignupOtp,
  resetPassword,
  signIn,
  signUp,
  verifySignupOtp,
} from "@/lib/auth";
import {
  ageProblem,
  emailProblem,
  normalizeUsername,
  passwordProblem,
  phoneProblem,
  usernameProblem,
} from "@/lib/auth-utils";

type Mode = "signup" | "login" | "otp" | "forgot" | "reset";
type UsernameStatus = "idle" | "checking" | "ok" | "taken";

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signup");
  const [otpEmail, setOtpEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [resetIdentifier, setResetIdentifier] = useState("");

  const showLogin = (text = "") => {
    setLoginNotice(text);
    setMode("login");
  };

  const goToOtp = (email: string, text = "") => {
    setOtpEmail(email);
    setNotice(text);
    setMode("otp");
  };

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="signup-shell">
        <section className="signup-visual">
          <img
            className="signup-image"
            src={crewPhoto}
            alt="Friends sharing a meal together at a public Eldoret restaurant"
            width={1440}
            height={912}
          />
          <div className="signup-image-shade" />
          <div className="signup-photo-content">
            <div className="brand-lockup">
              <LinkUpMark />
              <span>linkup</span>
            </div>
            <p className="eyebrow">GOOD COMPANY STARTS HERE</p>
            <h1>
              Going out
              <br />
              is better together.
            </h1>
            <div className="signup-photo-note">
              <span className="live-dot" /> Real people. Public places. Your kind of night.
            </div>
          </div>
          <div className="signup-crew-count">
            <Users size={15} /> Eldoret’s getting together
          </div>
        </section>

        <section className="signup-panel">
          <div className="brand-lockup signup-mobile-brand">
            <LinkUpMark />
            <span>linkup</span>
          </div>
          <div className="signup-copy">
            <p className="eyebrow accent-eyebrow">YOUR PEOPLE ARE OUT THERE</p>
            <h2>
              Make a little room
              <br className="mobile-break" /> for good company.
            </h2>
            <p>No pressure. No awkward one-to-ones. Just a friendly crew and a plan.</p>
          </div>

          {mode === "signup" && (
            <SignupForm onNeedOtp={(email) => goToOtp(email)} onSwitch={() => showLogin()} />
          )}
          {mode === "login" && (
            <LoginForm
              initialIdentifier={resetIdentifier}
              notice={loginNotice}
              onNeedOtp={(email) =>
                goToOtp(email, "Your email isn’t confirmed yet — we’ve sent a new code.")
              }
              onSwitch={() => setMode("signup")}
              onForgot={() => setMode("forgot")}
            />
          )}
          {mode === "forgot" && (
            <ForgotForm
              initialIdentifier={resetIdentifier}
              onSent={(identifier) => {
                setResetIdentifier(identifier);
                setMode("reset");
              }}
              onBack={() => showLogin()}
            />
          )}
          {mode === "reset" && (
            <ResetForm
              identifier={resetIdentifier}
              onDone={() => showLogin("Password updated. Log in with your new password.")}
              onBack={() => setMode("forgot")}
            />
          )}
          {mode === "otp" && (
            <OtpForm email={otpEmail} notice={notice} onBack={() => setMode("signup")} />
          )}
        </section>
      </div>
    </main>
  );
}

function FormHeading({
  mark,
  title,
  children,
}: {
  mark: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="form-heading">
      <span>{mark}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="form-error" role="alert">
      {children}
    </p>
  );
}

function SignupForm({
  onNeedOtp,
  onSwitch,
}: {
  onNeedOtp: (email: string) => void;
  onSwitch: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    age: "",
    email: "",
    phone: "",
    password: "",
  });
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Live "is this username free?" check, debounced.
  useEffect(() => {
    if (usernameProblem(form.username)) {
      setUsernameStatus("idle");
      return;
    }
    let cancelled = false;
    setUsernameStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const free = await isUsernameAvailable(form.username);
        if (!cancelled) setUsernameStatus(free ? "ok" : "taken");
      } catch {
        if (!cancelled) setUsernameStatus("idle");
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.username]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = {
      name: form.name.trim() ? undefined : "Tell us your name.",
      username:
        usernameProblem(form.username) ??
        (usernameStatus === "taken" ? "That username is taken." : undefined),
      age: ageProblem(form.age) ?? undefined,
      email: emailProblem(form.email) ?? undefined,
      phone: phoneProblem(form.phone) ?? undefined,
      password: passwordProblem(form.password) ?? undefined,
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setBusy(true);
    setFormError("");
    try {
      const { needsOtp } = await signUp(form);
      if (needsOtp) onNeedOtp(form.email.trim().toLowerCase());
    } catch (error) {
      setFormError(message(error, "Couldn’t create your account. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <FormHeading mark="01" title="Create your account">
        Takes a minute. Your next plan could last all night.
      </FormHeading>

      <label className="field-label" htmlFor="name">
        Your name
      </label>
      <Input
        id="name"
        placeholder="e.g. Wanjiku Mwangi"
        autoComplete="name"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        className="form-input"
      />
      {errors.name && <FieldError>{errors.name}</FieldError>}

      <label className="field-label" htmlFor="username">
        Username
      </label>
      <Input
        id="username"
        placeholder="e.g. wanjiku_m"
        autoComplete="username"
        autoCapitalize="none"
        value={form.username}
        onChange={(e) => set("username", normalizeUsername(e.target.value).replace(/\s/g, ""))}
        maxLength={20}
        className="form-input"
      />
      {errors.username ? (
        <FieldError>{errors.username}</FieldError>
      ) : (
        <p className="signup-footnote" style={{ justifyContent: "flex-start" }}>
          {usernameStatus === "checking" && "Checking…"}
          {usernameStatus === "ok" && "✓ Available"}
          {usernameStatus === "taken" && "That username is taken."}
          {usernameStatus === "idle" && "You’ll log in with this."}
        </p>
      )}

      <div className="signup-split">
        <div>
          <label className="field-label" htmlFor="age">
            Age
          </label>
          <Input
            id="age"
            type="number"
            inputMode="numeric"
            min="18"
            max="100"
            placeholder="18+"
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">
            Phone number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="0712 345 678"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="form-input"
          />
        </div>
      </div>
      {errors.age && <FieldError>{errors.age}</FieldError>}
      {errors.phone && <FieldError>{errors.phone}</FieldError>}

      <label className="field-label" htmlFor="email">
        Email
      </label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={form.email}
        onChange={(e) => set("email", e.target.value)}
        className="form-input"
      />
      {errors.email && <FieldError>{errors.email}</FieldError>}

      <label className="field-label" htmlFor="password">
        Password
      </label>
      <Input
        id="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => set("password", e.target.value)}
        className="form-input"
      />
      {errors.password && <FieldError>{errors.password}</FieldError>}

      {formError && <FieldError>{formError}</FieldError>}
      <Button type="submit" className="primary-cta" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Creating…
          </>
        ) : (
          <>
            Send my code <ArrowUpRight size={17} />
          </>
        )}
      </Button>
      <div className="signup-footnote">
        <ShieldCheck size={14} /> Verified members · Public spots only · Show up, be kind.
      </div>
      <p className="signup-switch">
        Already on the guest list?{" "}
        <button type="button" onClick={onSwitch}>
          Log in <ArrowUpRight size={13} />
        </button>
      </p>
    </form>
  );
}

function LoginForm({
  initialIdentifier,
  notice,
  onNeedOtp,
  onSwitch,
  onForgot,
}: {
  initialIdentifier: string;
  notice: string;
  onNeedOtp: (email: string) => void;
  onSwitch: () => void;
  onForgot: () => void;
}) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your username (or email) and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(identifier, password);
    } catch (err) {
      if (err instanceof AuthError && err.code === "email_not_confirmed" && err.email) {
        try {
          await resendSignupOtp(err.email);
          onNeedOtp(err.email);
          return;
        } catch (resendError) {
          setError(message(resendError, "Couldn’t send a new code."));
        }
      } else {
        setError(message(err, "Couldn’t log you in. Please try again."));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <FormHeading mark="→" title="Welcome back">
        Log in with your username and password.
      </FormHeading>

      <label className="field-label" htmlFor="identifier">
        Username or email
      </label>
      <Input
        id="identifier"
        autoComplete="username"
        autoCapitalize="none"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="form-input"
      />

      <label className="field-label" htmlFor="login-password">
        Password
      </label>
      <Input
        id="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="form-input"
      />
      <p className="signup-switch" style={{ marginTop: 8, textAlign: "right" }}>
        <button type="button" onClick={onForgot}>
          Forgot password?
        </button>
      </p>

      {notice && !error && (
        <p className="signup-footnote" role="status" style={{ justifyContent: "flex-start" }}>
          {notice}
        </p>
      )}
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" className="primary-cta" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Logging in…
          </>
        ) : (
          <>
            Log in <ArrowUpRight size={17} />
          </>
        )}
      </Button>
      <p className="signup-switch">
        New here?{" "}
        <button type="button" onClick={onSwitch}>
          Create an account <ArrowUpRight size={13} />
        </button>
      </p>
    </form>
  );
}

function ForgotForm({
  initialIdentifier,
  onSent,
  onBack,
}: {
  initialIdentifier: string;
  onSent: (identifier: string) => void;
  onBack: () => void;
}) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError("Enter your username or email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(identifier);
      onSent(identifier.trim());
    } catch (err) {
      setError(message(err, "Couldn’t send a code. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <FormHeading mark="↺" title="Forgot your password?">
        Enter your username or email and we’ll send a 6-digit code to the email on your account.
      </FormHeading>

      <label className="field-label" htmlFor="forgot-identifier">
        Username or email
      </label>
      <Input
        id="forgot-identifier"
        autoComplete="username"
        autoCapitalize="none"
        autoFocus
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="form-input"
      />

      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" className="primary-cta" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Sending…
          </>
        ) : (
          <>
            Send reset code <ArrowUpRight size={17} />
          </>
        )}
      </Button>

      <p className="signup-switch">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={13} /> Back to log in
        </button>
      </p>
    </form>
  );
}

const RESET_RESEND_SECONDS = 60;

function ResetForm({
  identifier,
  onDone,
  onBack,
}: {
  identifier: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESET_RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await resetPassword({ identifier, code, password });
      onDone();
    } catch (err) {
      setError(message(err, "Couldn’t reset your password. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    try {
      await requestPasswordReset(identifier);
      setInfo("New code requested. Check your inbox (and spam).");
      setCooldown(RESET_RESEND_SECONDS);
    } catch (err) {
      setError(message(err, "Couldn’t send a new code."));
    }
  };

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <FormHeading mark="↺" title="Check your email">
        If an account matches <strong>{identifier}</strong>, we’ve sent a 6-digit code to its email.
        It can take a minute.
      </FormHeading>

      <div className="mt-6 flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoFocus
          disabled={busy}
          aria-label="6-digit reset code"
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <label className="field-label" htmlFor="reset-password">
        New password
      </label>
      <Input
        id="reset-password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="form-input"
      />

      {info && <p className="signup-footnote">{info}</p>}
      {error && <FieldError>{error}</FieldError>}

      <Button type="submit" className="primary-cta" disabled={busy}>
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Updating…
          </>
        ) : (
          <>
            Update password <ArrowUpRight size={17} />
          </>
        )}
      </Button>

      <p className="signup-switch">
        Didn’t get it?{" "}
        <button type="button" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
      <p className="signup-switch" style={{ marginTop: 10 }}>
        <button type="button" onClick={onBack}>
          <ArrowLeft size={13} /> Use a different username or email
        </button>
      </p>
    </form>
  );
}

const RESEND_SECONDS = 30;

function OtpForm({ email, notice, onBack }: { email: string; notice: string; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(notice);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const verify = async (token: string) => {
    if (token.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      await verifySignupOtp(email, token);
      // Success: the session arrives via onAuthStateChange and the app swaps screens.
    } catch (err) {
      setError(message(err, "That code didn’t work."));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    try {
      await resendSignupOtp(email);
      setInfo("New code sent. Check your inbox (and spam).");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(message(err, "Couldn’t send a new code."));
    }
  };

  return (
    <form
      className="signup-form"
      onSubmit={(event) => {
        event.preventDefault();
        void verify(code);
      }}
    >
      <FormHeading mark="01" title="Check your email">
        We sent a 6-digit code to <strong>{email}</strong>. It can take a minute.
      </FormHeading>

      <div className="mt-6 flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          onComplete={(value) => void verify(value)}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoFocus
          disabled={busy}
          aria-label="6-digit confirmation code"
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {info && <p className="signup-footnote">{info}</p>}
      {error && <FieldError>{error}</FieldError>}

      <Button type="submit" className="primary-cta" disabled={busy || code.length !== 6}>
        {busy ? (
          <>
            <Loader2 size={17} className="animate-spin" /> Checking…
          </>
        ) : (
          <>
            Confirm my email <ArrowUpRight size={17} />
          </>
        )}
      </Button>

      <p className="signup-switch">
        Didn’t get it?{" "}
        <button type="button" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
      <p className="signup-switch" style={{ marginTop: 10 }}>
        <button type="button" onClick={onBack}>
          <ArrowLeft size={13} /> Use a different email
        </button>
      </p>
    </form>
  );
}
