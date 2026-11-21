import {
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import type { Screen, Vibe } from "@/lib/linkup-data";
import type { Applicant } from "@/lib/vibes";

/** Right-hand "your corner" panel (desktop). */
export function RightRail({
  profileName,
  avatarUrl,
  applicants,
  crewVibe,
  navTo,
}: {
  profileName: string;
  avatarUrl?: string;
  applicants: Applicant[];
  /** The crew whose chat the "Your crew's ready" shortcut opens, if you're in one. */
  crewVibe: Vibe | undefined;
  navTo: (target: Screen) => void;
}) {
  return (
    <aside className="right-rail">
      <section className="rail-greeting">
        <p className="eyebrow accent-eyebrow">YOUR LOCAL CREW</p>
        <h3>
          A good night
          <br />
          starts <span>right here.</span>
        </h3>
        <p>Today’s a good day to make a plan.</p>
      </section>
      <div className="rail-rule" />
      <section className="rail-activity">
        <div className="rail-section-title">
          <h3>Your corner</h3>
          <button onClick={() => navTo("manage")} aria-label="Your vibe details">
            <ChevronRight size={15} />
          </button>
        </div>
        {applicants.length > 0 && (
          <button className="rail-request" onClick={() => navTo("manage")}>
            <span className="rail-request-icon">
              <ArrowDownLeft size={15} />
            </span>
            <span>
              <strong>Someone’s in</strong>
              <span>
                {applicants[0]?.name}{" "}
                {applicants.length > 1 ? `and ${applicants.length - 1} more are` : "is"} waiting to
                join
              </span>
            </span>
            <span className="rail-request-count">{applicants.length}</span>
          </button>
        )}
        {crewVibe && (
          <button className="rail-request" onClick={() => navTo("chat")}>
            <span className="rail-chat-icon">
              <MessageCircle size={14} />
            </span>
            <span>
              <strong>Your crew’s ready</strong>
              <span>
                {crewVibe.venue} · {crewVibe.time}
              </span>
            </span>
            <ChevronRight size={14} />
          </button>
        )}
        {applicants.length === 0 && !crewVibe && (
          <p className="empty-note">Nothing waiting on you. Find a plan or put one out there.</p>
        )}
      </section>
      <section className="rail-profile">
        <div className="rail-profile-head">
          <UserAvatar
            name={profileName || "Wanjiku"}
            src={avatarUrl || null}
            className="rail-avatar"
          />
          <div>
            <strong>{profileName || "Wanjiku"}</strong>
            <span>
              <BadgeCheck size={12} /> Verified in Eldoret
            </span>
          </div>
        </div>
        <div className="rail-rating">
          <div>
            <Star size={14} />
            <strong>4.8</strong> <span>rating</span>
          </div>
          <Badge className="verified-badge">ON TIME</Badge>
        </div>
        <button onClick={() => navTo("profile")} className="rail-view-profile">
          Your profile <ArrowUpRight size={13} />
        </button>
      </section>
      <p className="rail-kindness">
        <Sparkles size={13} /> No pressure. Good vibes only.
      </p>
    </aside>
  );
}