/** Pure validation helpers. The database enforces the same rules (see 01_schema.sql). */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export function usernameProblem(value: string): string | null {
  const username = normalizeUsername(value);
  if (!username) return "Pick a username.";
  if (!USERNAME_RE.test(username)) return "3–20 characters: letters, numbers or underscore.";
  return null;
}

/** Kenyan mobile → +254XXXXXXXXX, or null. Accepts 07xx, 01xx, 2547xx, +2547xx, 7xx. */
export function normalizeKenyanPhone(value: string): string | null {
  const digits = value.replace(/[\s().-]/g, "");
  if (/^\+254[17]\d{8}$/.test(digits)) return digits;
  if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `+254${digits}`;
  return null;
}

export function phoneProblem(value: string): string | null {
  return normalizeKenyanPhone(value) ? null : "Enter a valid Kenyan number, e.g. 0712 345 678.";
}

export function emailProblem(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? null : "Enter a valid email address.";
}

export function passwordProblem(value: string): string | null {
  return value.length >= 8 ? null : "Use at least 8 characters.";
}

export function ageProblem(value: string): string | null {
  const age = Number(value);
  if (!Number.isInteger(age)) return "Enter your age.";
  if (age < 18) return "You need to be 18 or older to join.";
  if (age > 100) return "Enter a valid age.";
  return null;
}
