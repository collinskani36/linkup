import type { Vibe } from "@/lib/linkup-data";

/** The public address of the app. Override with VITE_SITE_URL if the domain changes. */
export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? "https://linkupsynkani.vercel.app"
).replace(/\/$/, "");

const INVITE_KEY = "linkup.invite";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The link people share for a vibe, e.g. https://linkupsynkani.vercel.app/vibe/<id>. */
export function inviteUrl(vibeId: string): string {
  return `${SITE_URL}/vibe/${vibeId}`;
}

/** The vibe id in a path like /vibe/<id>, or null if the path isn't an invite link. */
export function parseInvitePath(pathname: string): string | null {
  const match = /^\/vibe\/([^/]+)\/?$/.exec(pathname);
  const id = match?.[1];
  return id && UUID.test(id) ? id.toLowerCase() : null;
}

/**
 * Call once when the app starts. If the page was opened from an invite link, remember which vibe
 * (so it survives signing in or signing up first) and tidy the address bar back to "/".
 */
export function captureInvite(): void {
  try {
    const id = parseInvitePath(window.location.pathname);
    if (!id) return;
    window.sessionStorage.setItem(INVITE_KEY, id);
    window.history.replaceState(null, "", "/");
  } catch {
    // Storage can be blocked (private mode); the invite then just opens the normal feed.
  }
}

export function takePendingInvite(): string | null {
  try {
    return window.sessionStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    window.sessionStorage.removeItem(INVITE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The message that goes into WhatsApp along with the link. */
export function inviteMessage(vibe: Pick<Vibe, "id" | "title" | "date" | "time">): string {
  return `Join my plan on LinkUp: ${vibe.title}, ${vibe.date} at ${vibe.time}.\n${inviteUrl(vibe.id)}`;
}

/** Opens WhatsApp (app on a phone, WhatsApp Web on a computer) with the invite ready to send. */
export function whatsappShareUrl(vibe: Pick<Vibe, "id" | "title" | "date" | "time">): string {
  return `https://wa.me/?text=${encodeURIComponent(inviteMessage(vibe))}`;
}

/** Copies the invite link. Returns false if the browser wouldn't allow it. */
export async function copyInviteLink(vibeId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(inviteUrl(vibeId));
    return true;
  } catch {
    return false;
  }
}
