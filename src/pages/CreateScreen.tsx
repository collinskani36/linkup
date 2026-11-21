import type { Dispatch, FormEvent, SetStateAction } from "react";
import { format } from "date-fns";
import { ArrowUpRight, CalendarDays, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Choice, PageHeading } from "@/components/LinkUpShared";
import { accessOptions, vibeTypes, type Screen, type VibeDraft } from "@/lib/linkup-data";

export default function CreateScreen({
  draft,
  setDraft,
  venueError,
  setVenueError,
  onSubmit,
  navTo,
}: {
  draft: VibeDraft;
  setDraft: Dispatch<SetStateAction<VibeDraft>>;
  venueError: string;
  setVenueError: (message: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  navTo: (target: Screen) => void;
}) {
  const setField = <K extends keyof VibeDraft>(key: K, value: VibeDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  return (
    <>
      <PageHeading
        eyebrow="BRING PEOPLE TOGETHER"
        title={
          <>
            Put a good
            <br />
            thing <span>out there.</span>
          </>
        }
        subtitle="Pick a public place. Your people will find you."
        back={() => navTo("home")}
      />
      <form className="create-form" onSubmit={onSubmit}>
        <label className="field-label" htmlFor="vibe-title">
          Give your vibe a name
        </label>
        <Input
          id="vibe-title"
          placeholder="Friday nyama choma & good company"
          value={draft.title}
          onChange={(e) => setField("title", e.target.value)}
          className="form-input"
        />
        <label className="field-label" htmlFor="venue">
          Where are we meeting?
        </label>
        <Input
          id="venue"
          placeholder="Tamasha, Eldoret"
          value={draft.venue}
          onChange={(e) => {
            setField("venue", e.target.value);
            setVenueError("");
          }}
          aria-invalid={Boolean(venueError)}
          className="form-input"
        />
        <p className="field-hint">
          <ShieldCheck size={13} /> Public spots only for v1. No house parties.
        </p>
        {venueError && (
          <p className="form-error" role="alert">
            {venueError}
          </p>
        )}
        <span className="field-label">When are you going?</span>
        <div className="date-time-row">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="date-trigger">
                <CalendarDays size={15} />
                {draft.date ? format(draft.date, "EEE, MMM d") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={draft.date}
                onSelect={(date) => setField("date", date)}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
          <Input
            aria-label="Start time"
            type="time"
            value={draft.time}
            onChange={(e) => setField("time", e.target.value)}
            className="form-input time-input"
          />
        </div>
        <label className="field-label" htmlFor="budget">
          Budget per person
        </label>
        <div className="budget-input">
          <span>Ksh</span>
          <Input
            id="budget"
            type="number"
            min="0"
            max="20000"
            value={draft.budget}
            onChange={(e) => setField("budget", e.target.value)}
            className="form-input"
          />
        </div>
        <div className="budget-quick">
          <button type="button" onClick={() => setField("budget", "350")}>
            Around 350
          </button>
          <button type="button" onClick={() => setField("budget", "500")}>
            Around 500
          </button>
          <button type="button" onClick={() => setField("budget", "1000")}>
            Around 1,000
          </button>
        </div>
        <span className="field-label">What’s the vibe?</span>
        <div className="choice-grid create-choice-grid">
          {vibeTypes.map((type) => (
            <Choice
              key={type}
              label={type}
              selected={draft.type === type}
              onClick={() => setField("type", type)}
            />
          ))}
        </div>
        <span className="field-label">How big’s the crew?</span>
        <div className="segmented-control">
          {["4", "6", "8"].map((size) => (
            <button
              type="button"
              key={size}
              className={draft.size === size ? "segment-option selected" : "segment-option"}
              onClick={() => setField("size", size)}
            >
              {size} people
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="access">
          Who can join?
        </label>
        <Select value={draft.gender} onValueChange={(value) => setField("gender", value)}>
          <SelectTrigger id="access" className="form-select">
            <Users size={15} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accessOptions.map((choice) => (
              <SelectItem key={choice} value={choice}>
                {choice}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="field-label" htmlFor="description">
          Anything else the crew should know?
        </label>
        <Textarea
          id="description"
          placeholder="A little more about the plan…"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          maxLength={280}
          className="form-textarea"
        />
        <Button type="submit" className="primary-cta">
          Put it out there <ArrowUpRight size={17} />
        </Button>
        <p className="signup-footnote">
          <ShieldCheck size={14} /> Public place. Friendly faces. No pressure.
        </p>
      </form>
    </>
  );
}
