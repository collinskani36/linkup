import { describe, expect, it } from "vitest";

import {
  formatVibeDate,
  formatVibeTime,
  isInFuture,
  matchesTimeFilter,
  toStartsAt,
} from "@/lib/vibe-time";

// Wednesday 18 Nov 2026, 10:00 in Nairobi (07:00 UTC).
const now = new Date("2026-11-18T07:00:00Z");

describe("vibe times (Nairobi)", () => {
  it("builds a +03:00 timestamp from the form's day and time", () => {
    expect(toStartsAt(new Date(2026, 10, 20), "19:00")).toBe("2026-11-20T19:00:00+03:00");
    expect(toStartsAt(new Date(2026, 10, 20), "")).toBeNull();
    expect(toStartsAt(new Date(2026, 10, 20), "25:00")).toBeNull();
  });

  it("formats the time as 7:00 pm", () => {
    expect(formatVibeTime("2026-11-20T19:00:00+03:00")).toBe("7:00 pm");
    expect(formatVibeTime("2026-11-20T00:05:00+03:00")).toBe("12:05 am");
    expect(formatVibeTime("2026-11-20T12:30:00+03:00")).toBe("12:30 pm");
  });

  it("labels the day relative to today", () => {
    expect(formatVibeDate("2026-11-18T22:00:00+03:00", now)).toBe("Today");
    expect(formatVibeDate("2026-11-19T20:00:00+03:00", now)).toBe("Tomorrow");
    expect(formatVibeDate("2026-11-20T19:00:00+03:00", now)).toBe("Friday");
    expect(formatVibeDate("2026-11-28T19:00:00+03:00", now)).toBe("Sat, 28 Nov");
    expect(formatVibeDate("2026-11-17T21:00:00+03:00", now)).toBe("Yesterday");
    expect(formatVibeDate("2026-11-14T21:00:00+03:00", now)).toBe("Sat, 14 Nov");
  });

  it("counts a late-night Nairobi plan as the same day even when UTC has rolled over", () => {
    // 01:00 on the 19th in Nairobi is still 22:00 UTC on the 18th.
    expect(formatVibeDate("2026-11-19T01:00:00+03:00", now)).toBe("Tomorrow");
  });

  it("filters Tonight and This weekend", () => {
    expect(matchesTimeFilter("2026-11-18T20:00:00+03:00", "Tonight", now)).toBe(true);
    expect(matchesTimeFilter("2026-11-19T20:00:00+03:00", "Tonight", now)).toBe(false);

    expect(matchesTimeFilter("2026-11-20T19:00:00+03:00", "This weekend", now)).toBe(true); // Fri
    expect(matchesTimeFilter("2026-11-22T14:00:00+03:00", "This weekend", now)).toBe(true); // Sun
    expect(matchesTimeFilter("2026-11-19T19:00:00+03:00", "This weekend", now)).toBe(false); // Thu
    expect(matchesTimeFilter("2026-11-27T19:00:00+03:00", "This weekend", now)).toBe(false); // next Fri
    expect(matchesTimeFilter("2026-11-27T19:00:00+03:00", "All vibes", now)).toBe(true);
  });

  it("on a Sunday, This weekend means just today", () => {
    const sunday = new Date("2026-11-22T10:00:00+03:00");
    expect(matchesTimeFilter("2026-11-22T18:00:00+03:00", "This weekend", sunday)).toBe(true);
    expect(matchesTimeFilter("2026-11-27T18:00:00+03:00", "This weekend", sunday)).toBe(false);
  });

  it("knows what is in the future", () => {
    expect(isInFuture("2026-11-18T10:01:00+03:00", now)).toBe(true);
    expect(isInFuture("2026-11-18T09:59:00+03:00", now)).toBe(false);
  });
});
