import { Badge } from "@/components/ui/badge";

/** A labelled row showing everything someone picked in one section. */
export function PickChips({ label, picks }: { label: string; picks: string[] }) {
  if (!picks.length) return null;
  return (
    <div className="pick-row">
      <span className="pick-label">{label}</span>
      <div className="tag-row">
        {picks.map((pick) => (
          <Badge className="vibe-tag" key={pick}>
            {pick}
          </Badge>
        ))}
      </div>
    </div>
  );
}
