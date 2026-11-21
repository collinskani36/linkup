import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  Plus,
  Wine,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/LinkUpShared";
import { UserAvatar } from "@/components/UserAvatar";
import { canApproveJoinRequest } from "@/lib/linkup";
import type { Screen, Vibe } from "@/lib/linkup-data";
import type { Applicant } from "@/lib/vibes";

export default function ManageScreen({
  vibes,
  mineVibes,
  applicants,
  decidingRequestId,
  onApprove,
  onDecline,
  openDetail,
  navTo,
}: {
  vibes: Vibe[];
  mineVibes: Vibe[];
  applicants: Applicant[];
  /** The request being approved or declined right now, so its buttons can be switched off. */
  decidingRequestId: string | null;
  onApprove: (applicant: Applicant) => void;
  onDecline: (applicant: Applicant) => void;
  openDetail: (vibe: Vibe) => void;
  navTo: (target: Screen) => void;
}) {
  // Plans I've asked to join (waiting) or have been let into.
  const joined = vibes.filter(
    (vibe) => !vibe.mine && (vibe.isMember || vibe.myRequest?.status === "pending"),
  );

  return (
    <>
      <PageHeading
        eyebrow="YOUR GOOD THINGS"
        title={
          <>
            Your crew,
            <br />
            coming <span>together.</span>
          </>
        }
        subtitle="Your plans, your people, the little things that make it easy."
        back={() => navTo("home")}
      />
      <section className="manage-section">
        <div className="manage-section-heading">
          <div>
            <p className="eyebrow accent-eyebrow">HOSTING</p>
            <h2>
              Your vibes<span>.</span>
            </h2>
          </div>
          <button className="text-link" onClick={() => navTo("create")}>
            <Plus size={14} /> Create one
          </button>
        </div>
        {mineVibes.map((vibe) => {
          const waiting = applicants.filter((applicant) => applicant.vibeId === vibe.id);
          const hasSeat = canApproveJoinRequest(vibe.memberCount, vibe.size);
          return (
            <article key={vibe.id} className="manage-vibe">
              <div className="manage-vibe-head">
                <div>
                  <span className="manage-vibe-date">
                    <CalendarDays size={13} /> {vibe.date} · {vibe.time}
                  </span>
                  <h3>{vibe.title}</h3>
                  <p>
                    <MapPin size={13} /> {vibe.venue} <span>·</span> Ksh {vibe.budget} each
                  </p>
                </div>
                <Badge className={waiting.length > 0 ? "pending-badge" : "verified-badge"}>
                  {waiting.length > 0
                    ? `${waiting.length} REQUEST${waiting.length === 1 ? "" : "S"}`
                    : "YOUR VIBE"}
                </Badge>
              </div>
              <div className="manage-vibe-foot">
                <div className="crew-mini-avatars">
                  {vibe.members.slice(0, 3).map((member) => (
                    <UserAvatar
                      key={`${vibe.id}-${member.userId}`}
                      name={member.name}
                      src={member.avatarUrl}
                      className="crew-mini"
                    />
                  ))}
                  <span>
                    {vibe.memberCount}/{vibe.size} crew
                  </span>
                </div>
                <Button className="manage-open-button" onClick={() => openDetail(vibe)}>
                  Details <ChevronRight size={15} />
                </Button>
              </div>
              {waiting.map((applicant) => {
                const picks = [
                  ...applicant.genre.map((label) => ({ label, Icon: Music2 })),
                  ...applicant.drink.map((label) => ({ label, Icon: Wine })),
                  ...applicant.mood.map((label) => ({ label, Icon: Heart })),
                ].slice(0, 4);
                const deciding = decidingRequestId === applicant.requestId;
                return (
                  <div className="request-card" key={applicant.requestId}>
                    <div className="request-card-head">
                      <UserAvatar
                        name={applicant.name}
                        src={applicant.avatarUrl}
                        className="request-avatar"
                      />
                      <div className="request-name">
                        <strong>
                          {applicant.name} {applicant.isVerified && <BadgeCheck size={14} />}
                        </strong>
                        <span>{[applicant.age, applicant.base].filter(Boolean).join(" · ")}</span>
                      </div>
                      <Badge className="pending-badge">
                        <Clock3 size={11} /> WANTS IN
                      </Badge>
                    </div>
                    {picks.length > 0 && (
                      <div className="request-trust">
                        {picks.map(({ label, Icon }) => (
                          <span key={`${applicant.requestId}-${label}`}>
                            <Icon size={12} /> {label}
                          </span>
                        ))}
                      </div>
                    )}
                    {applicant.interests.length > 0 && (
                      <div className="tag-row request-tags">
                        {applicant.interests.slice(0, 3).map((interest) => (
                          <Badge className="vibe-tag" key={interest}>
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {applicant.bio && <p className="request-bio">“{applicant.bio}”</p>}
                    <div className="request-actions">
                      <Button
                        className="approve-button"
                        onClick={() => onApprove(applicant)}
                        disabled={!hasSeat || deciding}
                      >
                        <Check size={15} /> {hasSeat ? "Approve" : "Crew full"}
                      </Button>
                      <Button
                        variant="outline"
                        className="decline-button"
                        onClick={() => onDecline(applicant)}
                        disabled={deciding}
                      >
                        <X size={15} /> Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </article>
          );
        })}
        <div className="request-invite">
          <div className="request-invite-icon">
            <MessageCircle size={18} />
          </div>
          <div>
            <strong>Once you’re approved,</strong>
            <span>the private crew chat opens right here.</span>
          </div>
          <button onClick={() => navTo("chat")}>
            Open chat <ArrowUpRight size={13} />
          </button>
        </div>
      </section>
      <section className="manage-section join-section">
        <div className="manage-section-heading">
          <div>
            <p className="eyebrow accent-eyebrow">YOUR NEXT PLANS</p>
            <h2>
              Plans you found<span>.</span>
            </h2>
          </div>
          <Badge className="pending-badge">{joined.length} REQUESTS</Badge>
        </div>
        {joined.map((vibe) => (
          <button key={vibe.id} className="joined-vibe-link" onClick={() => openDetail(vibe)}>
            <div className="joined-vibe-symbol">
              <MapPin size={17} />
            </div>
            <div>
              <strong>{vibe.title}</strong>
              <span>
                {vibe.venue} ·{" "}
                {vibe.isMember ? "You’re in — chat is open" : "Waiting for host approval"}
              </span>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
        {joined.length === 0 && (
          <p className="empty-note">Nothing on the waiting list. Find a plan you love.</p>
        )}
      </section>
    </>
  );
}
