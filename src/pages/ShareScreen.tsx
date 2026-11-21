import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Copy,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyInviteLink, inviteUrl, whatsappShareUrl } from "@/lib/invite";
import type { Screen, Vibe } from "@/lib/linkup-data";

export default function ShareScreen({
  selectedVibe,
  notify,
  navTo,
}: {
  selectedVibe: Vibe | undefined;
  notify: (message: string) => void;
  navTo: (target: Screen) => void;
}) {
  const link = selectedVibe ? inviteUrl(selectedVibe.id) : "";
  return (
    <>
      <button className="page-back" onClick={() => navTo("home")}>
        <ArrowLeft size={15} /> Back to local plans
      </button>
      <section className="share-page">
        <div className="share-success">
          <Check size={27} />
        </div>
        <p className="eyebrow accent-eyebrow">YOUR PLAN IS OUT THERE</p>
        <h1>
          You made
          <br />a <span>good thing.</span>
        </h1>
        <p className="share-copy">
          {selectedVibe?.title} is on the Eldoret line-up. Share the link and your crew will start
          to gather.
        </p>
        <div className="share-plan-card">
          <span className="share-plan-dot">
            <Sparkles size={16} />
          </span>
          <div>
            <strong>{selectedVibe?.title}</strong>
            <span>
              <MapPin size={12} /> {selectedVibe?.venue}
            </span>
            <span>
              <CalendarDays size={12} /> {selectedVibe?.date}, {selectedVibe?.time}
            </span>
          </div>
          <Badge className="verified-badge">
            <BadgeCheck size={12} /> Live
          </Badge>
        </div>
        <p className="eyebrow share-label">SHARE THIS VIBE ON WHATSAPP</p>
        <div className="fake-link">
          <span>{link.replace(/^https?:\/\//, "")}</span>
          <button
            onClick={async () => {
              if (!selectedVibe) return;
              notify(
                (await copyInviteLink(selectedVibe.id))
                  ? "Link copied — spread the good vibes!"
                  : `Your invite link: ${link}`,
              );
            }}
            aria-label="Copy invite link"
          >
            <Copy size={15} />
          </button>
        </div>
        <Button
          onClick={() => {
            if (selectedVibe) window.open(whatsappShareUrl(selectedVibe), "_blank", "noopener");
          }}
          className="whatsapp-cta"
        >
          <Send size={16} /> Share on WhatsApp <ArrowUpRight size={15} />
        </Button>
        <button className="text-link share-feed-link" onClick={() => navTo("home")}>
          Find another local plan <ArrowUpRight size={13} />
        </button>
      </section>
    </>
  );
}
