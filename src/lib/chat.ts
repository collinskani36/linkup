import { supabase } from "@/lib/supabase";

export const MESSAGE_MAX_LENGTH = 1000;

/** One message in a crew chat. The author's name is looked up from the crew when it's shown. */
export type ChatMessage = {
  id: number;
  vibeId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

/** A row of the messages table, as the database or the live feed hands it over. */
export type MessageRow = {
  id: number;
  vibe_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

const MESSAGE_COLUMNS = "id, vibe_id, author_id, body, created_at";

export function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    vibeId: row.vibe_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Adds a message to the list unless it's already there (a sent message also comes back live). */
export function mergeMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((existing) => existing.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.id - b.id);
}

/** The latest messages of a crew chat, oldest first. */
export async function fetchMessages(vibeId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("vibe_id", vibeId)
    .order("id", { ascending: false })
    .limit(150);
  if (error) throw new Error("Couldn’t load the chat. Please try again.");
  return ((data ?? []) as unknown as MessageRow[]).map(toMessage).reverse();
}

export async function sendMessage(
  vibeId: string,
  authorId: string,
  body: string,
): Promise<ChatMessage> {
  const text = body.trim();
  if (!text) throw new Error("Write something first.");
  if (text.length > MESSAGE_MAX_LENGTH)
    throw new Error("That message is a bit long. Trim it down.");

  const { data, error } = await supabase
    .from("messages")
    .insert({ vibe_id: vibeId, author_id: authorId, body: text })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) {
    if (error.code === "42501") throw new Error("You can only chat in crews you’re part of.");
    throw new Error("Couldn’t send your message. Please try again.");
  }
  return toMessage(data as unknown as MessageRow);
}