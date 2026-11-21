import { describe, expect, it } from "vitest";

import { friendlyRpcError, toApplicant, toVibe, type VibeRow } from "@/lib/vibes";

const now = new Date("2026-11-18T07:00:00Z"); // Wed 18 Nov 2026, 10:00 Nairobi

const row: VibeRow = {
  id: "vibe-1",
  host_id: "host-1",
  title: "Friday nyama choma",
  venue: "Tamasha, Eldoret",
  starts_at: "2026-11-20T19:00:00+03:00",
  budget: 500,
  vibe_type: "Nyama choma",
  tags: ["Chill", "Nyama choma"],
  size: 6,
  access: "Mixed crew",
  description: "Easy Friday.",
  member_count: 3,
  host: { name: "Amina Njeri", is_verified: true, avatar_url: null },
  vibe_members: [],
};

describe("toVibe", () => {
  it("shows the count but no names to someone outside the crew", () => {
    const vibe = toVibe(row, "someone-else", null, now);
    expect(vibe.memberCount).toBe(3);
    expect(vibe.members).toEqual([]);
    expect(vibe.isMember).toBe(false);
    expect(vibe.mine).toBe(false);
    expect(vibe.host).toBe("Amina Njeri");
    expect(vibe.hostInitials).toBe("AN");
    expect(vibe.hostVerified).toBe(true);
    expect(vibe.hostAvatarUrl).toBeNull();
  });

  it("derives the Nairobi date and time labels", () => {
    const vibe = toVibe(row, "someone-else", null, now);
    expect(vibe.date).toBe("Friday");
    expect(vibe.time).toBe("7:00 pm");
  });

  it("puts the vibe type first in the tags without repeating it", () => {
    const vibe = toVibe(row, "someone-else", null, now);
    expect(vibe.tags).toEqual(["Nyama choma", "Chill"]);
  });

  it("treats the host as mine and in the crew, with the host listed first", () => {
    const vibe = toVibe(
      {
        ...row,
        vibe_members: [
          {
            user_id: "guest-1",
            role: "member",
            profiles: { name: "James", avatar_url: "https://img.test/james.jpg" },
          },
          { user_id: "host-1", role: "host", profiles: { name: "Amina Njeri", avatar_url: null } },
        ],
      },
      "host-1",
      null,
      now,
    );
    expect(vibe.mine).toBe(true);
    expect(vibe.isMember).toBe(true);
    expect(vibe.members.map((member) => member.name)).toEqual(["Amina Njeri", "James"]);
    expect(vibe.members.map((member) => member.avatarUrl)).toEqual([
      null,
      "https://img.test/james.jpg",
    ]);
  });

  it("recognises an approved guest from the crew list", () => {
    const vibe = toVibe(
      { ...row, vibe_members: [{ user_id: "guest-1", role: "member", profiles: null }] },
      "guest-1",
      { id: "req-1", status: "approved" },
      now,
    );
    expect(vibe.isMember).toBe(true);
    expect(vibe.mine).toBe(false);
    expect(vibe.members[0]?.name).toBe("Crew member");
    expect(vibe.myRequest).toEqual({ id: "req-1", status: "approved" });
  });
});

describe("join requests", () => {
  it("turns an applicant row into what the host card shows", () => {
    const applicant = toApplicant({
      id: "req-1",
      vibe_id: "vibe-1",
      user_id: "guest-1",
      created_at: "2026-11-18T07:00:00Z",
      applicant: {
        name: "Leila Mwangi",
        age: 26,
        base: "Eldoret",
        genre: ["Amapiano"],
        mood: ["Foodie"],
        drink: ["No shots"],
        interests: ["Music", "Gym"],
        bio: "Always up for good food.",
        is_verified: true,
        avatar_url: "https://img.test/leila.jpg",
      },
    });
    expect(applicant).toMatchObject({
      requestId: "req-1",
      vibeId: "vibe-1",
      name: "Leila Mwangi",
      age: 26,
      isVerified: true,
      avatarUrl: "https://img.test/leila.jpg",
      interests: ["Music", "Gym"],
    });
  });

  it("copes with a profile that can't be read", () => {
    const applicant = toApplicant({
      id: "req-2",
      vibe_id: "vibe-1",
      user_id: "guest-2",
      created_at: "2026-11-18T07:00:00Z",
      applicant: null,
    });
    expect(applicant.name).toBe("Someone new");
    expect(applicant.genre).toEqual([]);
    expect(applicant.isVerified).toBe(false);
    expect(applicant.avatarUrl).toBeNull();
  });

  it("shows the database's own messages but hides unexpected errors", () => {
    const fallback = "Couldn’t send your request.";
    expect(friendlyRpcError({ code: "P0001", message: "This crew is full" }, fallback)).toBe(
      "This crew is full",
    );
    expect(
      friendlyRpcError({ code: "42501", message: "Only the host can approve" }, fallback),
    ).toBe("Only the host can approve");
    expect(friendlyRpcError({ code: "08006", message: "connection failure" }, fallback)).toBe(
      fallback,
    );
  });
});
