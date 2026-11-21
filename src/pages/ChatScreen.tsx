import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ChevronRight, MapPin, Send, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { useChat } from "@/hooks/use-chat";
import { MESSAGE_MAX_LENGTH } from "@/lib/chat";
import type { Screen, Vibe } from "@/lib/linkup-data";
import { formatVibeDate, formatVibeTime } from "@/lib/vibe-time";

export default function ChatScreen({
  crews,
  activeCrew,
  meId,
  onPickCrew,
  notify,
  openDetail,
  navTo,
}: {
  /** Every upcoming vibe you're in the crew of. */
  crews: Vibe[];
  activeCrew: Vibe | undefined;
  meId: string;
  onPickCrew: (vibeId: string) => void;
  notify: (message: string) => void;
  openDetail: (vibe: Vibe) => void;
  navTo: (target: Screen) => void;
}) {
  const { messages, isLoading, isError, refetch, send } = useChat(activeCrew?.id, meId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length, activeCrew?.id]);

  if (!activeCrew) {
    return (
      <section className="chat-locked-state">
        <span className="chat-locked-icon">
          <ShieldCheck size={21} />
        </span>
        <p className="eyebrow accent-eyebrow">PRIVATE CREW CHAT</p>
        <h1>
          This chat is for
          <br />
          <span>approved crew.</span>
        </h1>
        <p>When the host approves your request, you can join the crew conversation here.</p>
        <Button className="primary-cta" onClick={() => navTo("manage")}>
          Check your request <Users size={16} />
        </Button>
      </section>
    );
  }

  const nameOf = (authorId: string) =>
    authorId === meId
      ? "You"
      : (activeCrew.members.find((member) => member.userId === authorId)?.name ?? "Crew member");

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim() || send.isPending) return;
    try {
      await send.mutateAsync(draft);
      setDraft("");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Couldn’t send your message.");
    }
  };

  return (
    <>
      <button className="page-back" onClick={() => navTo("manage")}>
        <ArrowLeft size={15} /> My vibes
      </button>
      <div className="chat-header">
        <div className="chat-group-mark">
          <Users size={19} />
        </div>
        <div>
          <p className="eyebrow accent-eyebrow">YOUR CREW</p>
          <h1>
            The good company chat<span>.</span>
          </h1>
          <span>
            <span className="live-dot" /> {activeCrew.memberCount} people · Eldoret
          </span>
        </div>
        <button className="chat-members" aria-label="Crew members">
          <Users size={16} />
        </button>
      </div>
      {crews.length > 1 && (
        <Select value={activeCrew.id} onValueChange={onPickCrew}>
          <SelectTrigger aria-label="Choose a crew chat" className="mb-3 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {crews.map((crew) => (
              <SelectItem key={crew.id} value={crew.id}>
                {crew.title} · {crew.date}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="chat-vibe-banner">
        <div className="chat-vibe-icon">
          <MapPin size={17} />
        </div>
        <div>
          <strong>{activeCrew.title}</strong>
          <span>
            {activeCrew.venue} · {activeCrew.date}, {activeCrew.time}
          </span>
        </div>
        <button onClick={() => openDetail(activeCrew)}>
          Details <ChevronRight size={14} />
        </button>
      </div>
      <div className="pinned-message">
        <div className="pin-mark">
          <ShieldCheck size={14} />
        </div>
        <div>
          <span>THE PLAN</span>
          <strong>
            Meet at {activeCrew.venue}, {activeCrew.time}. Public spot. Stay together.
          </strong>
        </div>
      </div>
      <div className="chat-messages" aria-live="polite">
        {isLoading && <p className="empty-note">Loading the chat…</p>}
        {isError && !isLoading && (
          <p className="empty-note" role="alert">
            Couldn’t load the chat.{" "}
            <button className="text-link" onClick={refetch}>
              Try again
            </button>
          </p>
        )}
        {!isLoading && !isError && messages.length === 0 && (
          <p className="empty-note">No messages yet. Say hey to your crew.</p>
        )}
        {messages.map((message, index) => {
          const day = formatVibeDate(message.createdAt);
          const startsNewDay =
            index === 0 || formatVibeDate(messages[index - 1]!.createdAt) !== day;
          const mine = message.authorId === meId;
          const author = nameOf(message.authorId);
          const authorAvatar =
            activeCrew.members.find((member) => member.userId === message.authorId)?.avatarUrl ??
            null;
          return (
            <div key={message.id} style={{ display: "contents" }}>
              {startsNewDay && (
                <div className="chat-day-divider" style={{ alignSelf: "stretch" }}>
                  <span>{day.toUpperCase()}</span>
                </div>
              )}
              <div className={mine ? "chat-message mine-message" : "chat-message"}>
                <UserAvatar name={author} src={authorAvatar} className="message-avatar" />
                <div className="message-bubble-wrap">
                  <div className="message-meta">
                    <strong>{author}</strong>
                    <span>{formatVibeTime(message.createdAt)}</span>
                  </div>
                  <div className="message-bubble">{message.body}</div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input-row" onSubmit={(event) => void sendMessage(event)}>
        <Input
          aria-label="Write a crew message"
          placeholder="Say hey to your crew…"
          value={draft}
          maxLength={MESSAGE_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          className="chat-input"
        />
        <Button
          type="submit"
          className="chat-send"
          size="icon"
          aria-label="Send message"
          disabled={send.isPending}
        >
          <Send size={16} />
        </Button>
      </form>
      <div className="chat-safety">
        <ShieldCheck size={13} /> You’re with approved crew members only.
      </div>
    </>
  );
}
