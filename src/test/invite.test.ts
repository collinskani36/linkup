import { describe, expect, it } from "vitest";

import { inviteUrl, parseInvitePath, whatsappShareUrl } from "@/lib/invite";

const id = "3f2b8c1e-9d4a-4b6f-8a1c-5e7d2c9b0a41";

describe("invite links", () => {
  it("builds the public link for a vibe", () => {
    expect(inviteUrl(id)).toBe(`https://linkupsynkani.vercel.app/vibe/${id}`);
  });

  it("reads the vibe id from an invite path", () => {
    expect(parseInvitePath(`/vibe/${id}`)).toBe(id);
    expect(parseInvitePath(`/vibe/${id}/`)).toBe(id);
  });

  it("ignores other paths and ids that aren't real", () => {
    expect(parseInvitePath("/")).toBeNull();
    expect(parseInvitePath("/vibe/not-an-id")).toBeNull();
    expect(parseInvitePath(`/other/${id}`)).toBeNull();
  });

  it("puts the title, time and link into the WhatsApp message", () => {
    const url = whatsappShareUrl({
      id,
      title: "Nyama choma",
      date: "Sat, Nov 28",
      time: "7:00 PM",
    });
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const text = decodeURIComponent(url.split("text=")[1] ?? "");
    expect(text).toContain("Nyama choma");
    expect(text).toContain(inviteUrl(id));
  });
});
