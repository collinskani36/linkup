import { describe, expect, it } from "vitest";

import { mergeMessage, toMessage, type ChatMessage, type MessageRow } from "@/lib/chat";

const row = (id: number, body = "hey"): MessageRow => ({
  id,
  vibe_id: "vibe-1",
  author_id: "guest-1",
  body,
  created_at: "2026-11-18T07:00:00Z",
});

describe("chat messages", () => {
  it("maps a database row", () => {
    expect(toMessage(row(7, "see you at 7"))).toEqual({
      id: 7,
      vibeId: "vibe-1",
      authorId: "guest-1",
      body: "see you at 7",
      createdAt: "2026-11-18T07:00:00Z",
    });
  });

  it("ignores a message that is already in the list (sent, then delivered live)", () => {
    const list: ChatMessage[] = [toMessage(row(1)), toMessage(row(2))];
    expect(mergeMessage(list, toMessage(row(2)))).toBe(list);
  });

  it("keeps messages in order even when one arrives late", () => {
    const list: ChatMessage[] = [toMessage(row(1)), toMessage(row(3))];
    const merged = mergeMessage(list, toMessage(row(2)));
    expect(merged.map((message) => message.id)).toEqual([1, 2, 3]);
  });
});
