import type { CrewMember, RequestStatus, Vibe, VibeType } from "@/lib/linkup-data";
import { supabase } from "@/lib/supabase";
import { formatVibeDate, formatVibeTime } from "@/lib/vibe-time";

/** Shown under the venue field when the database refuses a non-public venue. */
export const VENUE_ERROR =
  "Choose a public venue, like a restaurant, café, or bar. No house parties.";

/** One vibe as the database returns it, with the host and crew joined in. */
export type VibeRow = {
  id: string;
  host_id: string;
  title: string;
  venue: string;
  starts_at: string;
  budget: number;
  vibe_type: VibeType;
  tags: string[];
  size: number;
  access: string;
  description: string;
  member_count: number;
  host: { name: string; is_verified: boolean } | null;
  // Row-level security only returns these when you are in the crew, so for everyone else it is [].
  vibe_members: { user_id: string; role: "host" | "member"; profiles: { name: string } | null }[];
};

export type MyRequest = { id: string; status: RequestStatus };

// The explicit hint is needed: profiles can also be reached through vibe_members.
const VIBE_SELECT = `
  id, host_id, title, venue, starts_at, budget, vibe_type, tags, size, access, description,
  member_count,
  host:profiles!vibes_host_id_fkey ( name, is_verified ),
  vibe_members ( user_id, role, profiles ( name ) )
`;

/** Open vibes that haven't started yet, soonest first. */
export async function fetchUpcomingVibes(): Promise<VibeRow[]> {
  const { data, error } = await supabase
    .from("vibes")
    .select(VIBE_SELECT)
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .order("joined_at", { referencedTable: "vibe_members", ascending: true })
    .limit(100);
  if (error) throw new Error("Couldn’t load the plans. Please try again.");
  return (data ?? []) as unknown as VibeRow[];
}

/** My own join requests, keyed by vibe id. */
export async function fetchMyRequests(userId: string): Promise<Record<string, MyRequest>> {
  const { data, error } = await supabase
    .from("join_requests")
    .select("id, vibe_id, status")
    .eq("user_id", userId);
  if (error) throw new Error("Couldn’t load your requests. Please try again.");

  const rows = (data ?? []) as { id: string; vibe_id: string; status: RequestStatus }[];
  return Object.fromEntries(rows.map((row) => [row.vibe_id, { id: row.id, status: row.status }]));
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function toVibe(
  row: VibeRow,
  userId: string,
  myRequest: MyRequest | null,
  now = new Date(),
): Vibe {
  const hostName = row.host?.name ?? "Your host";
  const members: CrewMember[] = row.vibe_members
    .map((member) => ({
      userId: member.user_id,
      name: member.profiles?.name ?? "Crew member",
      role: member.role,
    }))
    .sort((a, b) => Number(b.role === "host") - Number(a.role === "host"));
  const mine = row.host_id === userId;

  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    startsAt: row.starts_at,
    date: formatVibeDate(row.starts_at, now),
    time: formatVibeTime(row.starts_at),
    budget: row.budget,
    vibeType: row.vibe_type,
    tags: [row.vibe_type, ...row.tags.filter((tag) => tag !== row.vibe_type)],
    size: row.size,
    access: row.access,
    description: row.description,
    host: hostName,
    hostInitials: initialsOf(hostName),
    hostVerified: row.host?.is_verified ?? false,
    mine,
    memberCount: row.member_count,
    members,
    isMember: mine || members.some((member) => member.userId === userId),
    myRequest,
  };
}

export type NewVibe = {
  title: string;
  venue: string;
  /** ISO timestamp, see toStartsAt in vibe-time.ts. */
  startsAt: string;
  budget: number;
  vibeType: VibeType;
  size: number;
  access: string;
  description: string;
};

/** Creates a vibe and returns its id. (A database trigger adds the host to the crew.) */
export async function createVibe(hostId: string, input: NewVibe): Promise<string> {
  const { data, error } = await supabase
    .from("vibes")
    .insert({
      host_id: hostId,
      title: input.title,
      venue: input.venue,
      starts_at: input.startsAt,
      budget: input.budget,
      vibe_type: input.vibeType,
      tags: [],
      size: input.size,
      access: input.access,
      description: input.description,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("public_venue_only")) throw new Error(VENUE_ERROR);
    if (error.code === "42501") throw new Error("Pick a start time in the future.");
    throw new Error("Couldn’t create your vibe. Please try again.");
  }
  return data.id as string;
}
