import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Wine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import crewPhoto from "@/assets/linkup-crew.jpg";
import { VibeCard } from "@/components/VibeCard";
import { vibeTypes, type Screen, type Vibe } from "@/lib/linkup-data";

export default function HomeScreen({
  filteredVibes,
  timeFilter,
  typeFilter,
  budgetFilter,
  isLoading,
  isError,
  onRetry,
  setTimeFilter,
  setTypeFilter,
  setBudgetFilter,
  notify,
  openDetail,
  navTo,
}: {
  filteredVibes: Vibe[];
  timeFilter: string;
  typeFilter: string;
  budgetFilter: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  setTimeFilter: (value: string) => void;
  setTypeFilter: (value: string) => void;
  setBudgetFilter: (value: string) => void;
  notify: (message: string) => void;
  openDetail: (vibe: Vibe) => void;
  navTo: (target: Screen) => void;
}) {
  return (
    <>
      <div className="feed-heading">
        <div>
          <p className="eyebrow accent-eyebrow">YOUR TOWN, YOUR KIND OF NIGHT</p>
          <h1>
            Good things
            <br className="mobile-break" /> are happening <span>near you.</span>
          </h1>
          <p>Little plans. Lovely people. Nothing but good vibes.</p>
        </div>
        <button className="filter-map" onClick={() => notify("Showing Eldoret vibes only.")}>
          <MapPin size={15} /> Eldoret only
        </button>
      </div>
      <section className="featured-hero" aria-label="Welcome to LinkUp">
        <img
          src={crewPhoto}
          alt="A friendly group sharing nyama choma at an open-air restaurant"
          width={1440}
          height={912}
        />
        <div className="featured-shade" />
        <div className="featured-copy">
          <Badge className="featured-pill">
            <Sparkles size={12} /> THE ELDY EDIT
          </Badge>
          <h2>
            Your city.
            <br />
            Your new crew.
          </h2>
          <p>Find a local vibe that feels like you.</p>
          <button onClick={() => setTypeFilter("Any vibe")} className="featured-link">
            See what’s on <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="featured-count">
          <span className="live-dot" /> {isLoading ? "…" : filteredVibes.length} plans in Eldoret
        </div>
      </section>
      <div className="feed-section-heading">
        <div>
          <p className="eyebrow accent-eyebrow">PICK YOUR PLAN</p>
          <h2>
            The local line-up<span>.</span>
          </h2>
        </div>
        <button
          className="text-link"
          onClick={() => {
            setTimeFilter("All vibes");
            setTypeFilter("Any vibe");
            setBudgetFilter("Any budget");
          }}
        >
          Reset filters <ArrowUpRight size={13} />
        </button>
      </div>
      <div className="filter-row" aria-label="Filter local plans">
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="filter-select">
            <CalendarDays size={14} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All vibes">Any time</SelectItem>
            <SelectItem value="Tonight">Tonight</SelectItem>
            <SelectItem value="This weekend">This weekend</SelectItem>
          </SelectContent>
        </Select>
        <Select value={budgetFilter} onValueChange={setBudgetFilter}>
          <SelectTrigger className="filter-select">
            <Wine size={14} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any budget">Any budget</SelectItem>
            <SelectItem value="Under Ksh 500">Under Ksh 500</SelectItem>
            <SelectItem value="Under Ksh 1,000">Under Ksh 1,000</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="filter-select">
            <Sparkles size={14} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Any vibe">Any vibe</SelectItem>
            {vibeTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="vibe-list">
        {isLoading && (
          <div className="empty-state" role="status">
            <Sparkles size={23} />
            <h3>Finding plans near you…</h3>
          </div>
        )}
        {isError && !isLoading && (
          <div className="empty-state" role="alert">
            <Sparkles size={23} />
            <h3>We couldn’t load the plans.</h3>
            <p>Check your connection and try again.</p>
            <Button onClick={onRetry} className="primary-cta">
              Try again
            </Button>
          </div>
        )}
        {filteredVibes.map((vibe) => (
          <VibeCard key={vibe.id} vibe={vibe} onClick={() => openDetail(vibe)} />
        ))}
        {!isLoading && !isError && filteredVibes.length === 0 && (
          <div className="empty-state">
            <Sparkles size={23} />
            <h3>No plans just yet.</h3>
            <p>Try another filter, or start a good thing yourself.</p>
            <Button onClick={() => navTo("create")} className="primary-cta">
              Create a vibe <Plus size={16} />
            </Button>
          </div>
        )}
      </div>
      <button className="create-fab" onClick={() => navTo("create")}>
        <Plus size={18} />
        <span>Create a vibe</span>
      </button>
      <div className="house-rule">
        <ShieldCheck size={14} />
        <span>
          <strong>Meet in public. Look out for each other.</strong> We like our plans out in the
          open.
        </span>
      </div>
    </>
  );
}