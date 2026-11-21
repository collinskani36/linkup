import type { ProfileForm } from "@/lib/profile";

export type Screen =
  "setup" | "home" | "create" | "share" | "detail" | "manage" | "chat" | "profile" | "edit-profile";
export type VibeType = "Chill" | "Nyama choma" | "Games" | "Dancing" | "Club";
export type RequestStatus = "pending" | "approved" | "declined" | "cancelled";

/** One person in a crew. The database only shows these to people who are in the crew. */
export type CrewMember = {
  userId: string;
  name: string;
  role: "host" | "member";
  avatarUrl: string | null;
};

/** A vibe as the screens use it (built from the database rows in lib/vibes.ts). */
export type Vibe = {
  id: string;
  title: string;
  venue: string;
  /** ISO timestamp; `date` and `time` below are the Nairobi-time labels worked out from it. */
  startsAt: string;
  date: string;
  time: string;
  budget: number;
  vibeType: VibeType;
  /** The vibe type first, then any extra tags. */
  tags: string[];
  size: number;
  /** Who can join: "Girls only" | "Mixed crew" | "Anyone welcome". */
  access: string;
  description: string;
  host: string;
  hostInitials: string;
  hostAvatarUrl: string | null;
  hostVerified: boolean;
  /** You are the host. */
  mine: boolean;
  /** How many people are in the crew, host included. Visible to everyone. */
  memberCount: number;
  /** Who they are. Only filled in when you are in the crew. */
  members: CrewMember[];
  /** You are in the crew (the host counts). */
  isMember: boolean;
  /** Your own request to join, if you have made one. */
  myRequest: { id: string; status: RequestStatus } | null;
};

export const genres = ["Amapiano", "Afrobeat", "Gengetone", "R&B", "Gospel", "Bongo", "Old school"];
export const moods = ["Chill + talk", "Nyama choma", "Games", "Dancing", "Club late night"];
export const drinks = [
  "Social — 2 drinks max",
  "I like cocktails",
  "I don't do shots",
  "I mostly do soda/water but I love the vibe",
];
export const interests = ["Football", "Music", "Foodie", "Movies", "Church", "Gym", "Business"];
export const vibeTypes: VibeType[] = ["Chill", "Nyama choma", "Games", "Dancing", "Club"];
export const accessOptions = ["Girls only", "Mixed crew", "Anyone welcome"];

/** The profile shape the LinkUp screens edit (same as what is saved to Supabase). */
export type Profile = ProfileForm;

export type PickField = "genre" | "mood" | "drink";

export const blankProfile: Profile = {
  name: "",
  age: "",
  phone: "",
  base: "Eldoret",
  genre: [],
  mood: [],
  drink: [],
  interests: [],
  bio: "",
  avatarUrl: "",
};

/** What the "Create a vibe" form holds while someone is filling it in. */
export type VibeDraft = {
  title: string;
  venue: string;
  date: Date | undefined;
  time: string;
  budget: string;
  type: VibeType;
  size: string;
  gender: string;
  description: string;
};

export const blankDraft: VibeDraft = {
  title: "",
  venue: "",
  date: undefined,
  time: "19:00",
  budget: "500",
  type: "Chill",
  size: "6",
  gender: "Mixed crew",
  description: "",
};
