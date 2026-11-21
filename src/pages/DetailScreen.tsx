import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  MapPin,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import { copyInviteLink, inviteUrl, whatsappShareUrl } from "@/lib/invite";
import type { Screen, Vibe } from "@/lib/linkup-data";

export default function DetailScreen({
  selectedVibe,
  meId,
  notify,
  requestToJoin,
  requestBusy,
  cancelRequest,
  cancelBusy,
  navTo,
}: {
  selectedVibe: Vibe | undefined;
  meId: string;
  notify: (message: string) => void;
  requestToJoin: () => void;
  requestBusy: boolean;
  cancelRequest: () => void;
  cancelBusy: boolean;
  navTo: (target: Screen) => void;
}) {
  const isFull = selectedVibe ? selectedVibe.memberCount >= selectedVibe.size : false;
  const requestStatus = selectedVibe?.myRequest?.status;

  return (
    <>
      <button className="page-back" onClick={() => navTo("home")}>
        <ArrowLeft size={15} /> Eldoret plans
      </button>
      {selectedVibe && (
        <>
          <div className="detail-topline">
            <Badge className="verified-badge">
              <MapPin size={12} /> PUBLIC SPOT
            </Badge>
            <button
              className="detail-more"
              aria-label="More vibe options"
              onClick={() => notify("Good to keep it kind, on and offline.")}
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
          <p className="eyebrow accent-eyebrow">
            {selectedVibe.date.toUpperCase()} · {selectedVibe.time.toUpperCase()}
          </p>
          <h1 className="detail-title">{selectedVibe.title}</h1>
          <div className="detail-place">
            <MapPin size={16} /> <span>{selectedVibe.venue}</span>{" "}
            <span className="detail-place-dot">·</span>{" "}
            <span>Ksh {selectedVibe.budget} per person</span>
          </div>
          <div className="tag-row detail-tags">
            {selectedVibe.tags.map((tag) => (
              <Badge key={tag} className="vibe-tag">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="detail-description">{selectedVibe.description}</p>
          <div className="detail-stats">
            <div>
              <Users size={16} />
              <strong>
                {selectedVibe.memberCount} of {selectedVibe.size}
              </strong>
              <span>in the crew</span>
            </div>
            <div>
              <ShieldCheck size={16} />
              <strong>{selectedVibe.access}</strong>
              <span>come as you are</span>
            </div>
            <div>
              <Clock3 size={16} />
              <strong>{selectedVibe.time}</strong>
              <span>easy does it</span>
            </div>
          </div>
          <section className="crew-section">
            <div className="section-heading">
              <h2>
                Meet the crew<span>.</span>
              </h2>
              <span>
                {selectedVibe.memberCount}/{selectedVibe.size}
              </span>
            </div>
            {selectedVibe.isMember ? (
              <div className="crew-people">
                {selectedVibe.members.map((member, index) => (
                  <div className="crew-member" key={member.userId}>
                    <UserAvatar
                      name={member.name}
                      src={member.avatarUrl}
                      className={index === 0 ? "crew-avatar crew-avatar-featured" : "crew-avatar"}
                    />
                    <span>{member.userId === meId ? "You" : member.name}</span>
                    {member.role === "host" && <BadgeCheck className="verified-tick" size={13} />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-note">
                The crew’s names open up once the host lets you in. For now, it’s{" "}
                {selectedVibe.host} and {Math.max(selectedVibe.memberCount - 1, 0)} other
                {selectedVibe.memberCount - 1 === 1 ? "" : "s"}.
              </p>
            )}
          </section>
          <div className="creator-card">
            <UserAvatar
              name={selectedVibe.host}
              src={selectedVibe.hostAvatarUrl}
              className="creator-avatar"
            />
            <div className="creator-info">
              <span>YOUR HOST</span>
              <strong>
                {selectedVibe.host}
                {selectedVibe.hostVerified && <BadgeCheck size={14} />}
              </strong>
              <div>{selectedVibe.mine ? "That’s you" : "Hosting this one"}</div>
            </div>
            <button
              className="creator-more"
              onClick={() => notify("Good vibes only. Keep personal details in the crew chat.")}
              aria-label="Creator profile details"
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="public-reminder">
            <ShieldCheck size={16} />
            <span>
              <strong>Public spot, always.</strong> We meet out in the open and look out for each
              other.
            </span>
          </div>
          {selectedVibe.isMember && (
            <div className="invite-share">
              <p className="eyebrow share-label">BRING SOMEONE ALONG</p>
              <div className="fake-link">
                <span>{inviteUrl(selectedVibe.id).replace(/^https?:\/\//, "")}</span>
                <button
                  onClick={async () =>
                    notify(
                      (await copyInviteLink(selectedVibe.id))
                        ? "Link copied — spread the good vibes!"
                        : `Your invite link: ${inviteUrl(selectedVibe.id)}`,
                    )
                  }
                  aria-label="Copy invite link"
                >
                  <Copy size={15} />
                </button>
              </div>
              <Button
                className="whatsapp-cta"
                onClick={() => window.open(whatsappShareUrl(selectedVibe), "_blank", "noopener")}
              >
                <Send size={16} /> Share on WhatsApp <ArrowUpRight size={15} />
              </Button>
            </div>
          )}
          {selectedVibe.mine ? (
            <Button className="primary-cta" onClick={() => navTo("manage")}>
              Manage my vibe <Users size={16} />
            </Button>
          ) : selectedVibe.isMember ? (
            <div className="request-confirmation">
              <CheckCircle2 size={19} />
              <div>
                <strong>You’re in — see you there.</strong>
                <span>The private crew chat is open.</span>
              </div>
            </div>
          ) : requestStatus === "pending" ? (
            <div className="request-confirmation">
              <CheckCircle2 size={19} />
              <div>
                <strong>Request sent — you’re on their radar.</strong>
                <span>Waiting for {selectedVibe.host} to approve your spot.</span>
              </div>
              <button className="text-link" onClick={cancelRequest} disabled={cancelBusy}>
                {cancelBusy ? "Cancelling…" : "Cancel request"}
              </button>
            </div>
          ) : requestStatus === "declined" ? (
            <div className="request-confirmation">
              <ShieldCheck size={19} />
              <div>
                <strong>This one isn’t a match.</strong>
                <span>{selectedVibe.host} declined your request. Plenty more plans to find.</span>
              </div>
            </div>
          ) : isFull ? (
            <div className="request-confirmation">
              <Users size={19} />
              <div>
                <strong>This crew is full.</strong>
                <span>Have a look at the other plans on the line-up.</span>
              </div>
            </div>
          ) : (
            <Button className="primary-cta" onClick={requestToJoin} disabled={requestBusy}>
              {requestBusy ? "Sending…" : "Request to join"} <ArrowUpRight size={17} />
            </Button>
          )}
        </>
      )}
    </>
  );
}
