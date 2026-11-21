import { ArrowUpRight, BadgeCheck, CalendarDays, MapPin, Users } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Badge } from "@/components/ui/badge";
import type { Vibe } from "@/lib/linkup-data";

export function VibeCard({ vibe, onClick }: { vibe: Vibe; onClick: () => void }) {
  const seatsLeft = Math.max(0, vibe.size - vibe.memberCount);
  return (
    <button className="vibe-card" onClick={onClick}>
      <div className="vibe-card-top">
        <UserAvatar name={vibe.host} src={vibe.hostAvatarUrl} className="host-avatar" />
        <div className="vibe-card-host">
          <strong>
            {vibe.host}
            {vibe.hostVerified && <BadgeCheck size={14} />}
          </strong>
          <span>
            {vibe.mine
              ? "That’s your vibe"
              : vibe.hostVerified
                ? "Verified local host"
                : "Local host"}
          </span>
        </div>
        <span className="vibe-card-date">
          <CalendarDays size={12} /> {vibe.date} <span>·</span> {vibe.time}
        </span>
      </div>
      <div className="vibe-card-body">
        <p className="eyebrow accent-eyebrow">{vibe.date.toUpperCase()} IN ELDORET</p>
        <h3>{vibe.title}</h3>
        <div className="vibe-place">
          <MapPin size={14} />
          {vibe.venue}
        </div>
        <p className="vibe-card-description">{vibe.description}</p>
        <div className="vibe-card-tags">
          {vibe.tags.map((tag) => (
            <Badge key={tag} className="vibe-tag">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="vibe-card-foot">
          <span className="budget-label">
            <span>Ksh</span> {vibe.budget}
            <small> / person</small>
          </span>
          <span className="crew-seats">
            <span className="crew-seats-people">
              <Users size={14} /> {vibe.memberCount}/{vibe.size}
            </span>
            <span>{seatsLeft === 1 ? "1 seat left" : `${seatsLeft} seats left`}</span>
          </span>
          <span className="access-chip">
            <span className="access-live-dot" />
            {vibe.access}
          </span>
          <span className="vibe-card-arrow">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </button>
  );
}