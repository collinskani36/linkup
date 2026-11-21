import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LinkUpMark } from "@/components/LinkUpMark";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import type { Screen } from "@/lib/linkup-data";

/** Top bar: brand, location and the quick link to your profile. */
export function AppHeader({
  base,
  profileName,
  avatarUrl,
  navTo,
}: {
  base: string;
  profileName: string;
  avatarUrl?: string;
  navTo: (target: Screen) => void;
}) {
  return (
    <header className="app-header">
      <button
        className="brand-lockup app-brand"
        onClick={() => navTo("home")}
        aria-label="LinkUp home"
      >
        <LinkUpMark />
        <span>linkup</span>
      </button>
      <button className="location-select" aria-label="Your location: Eldoret">
        <MapPin size={15} />
        <span>{base || "Eldoret"}</span>
        <ChevronDown size={14} />
      </button>
      <div className="header-right">
        <span className="header-promise">
          <span className="live-dot" /> Good people, good plans.
        </span>
        <button
          className="header-profile"
          onClick={() => navTo("profile")}
          aria-label="Open your profile"
        >
          <UserAvatar
            name={profileName || "Wanjiku"}
            src={avatarUrl || null}
            className="mini-avatar"
          />
          <ChevronDown size={13} />
        </button>
      </div>
    </header>
  );
}

/** Left sidebar (desktop). */
export function SideNav({
  screen,
  pendingRequestCount,
  navTo,
}: {
  screen: Screen;
  pendingRequestCount: number;
  navTo: (target: Screen) => void;
}) {
  return (
    <aside className="side-nav" aria-label="Main navigation">
      <p className="side-nav-label">YOUR LOCAL CREW</p>
      <NavLink
        active={screen === "home" || screen === "detail" || screen === "share"}
        icon={<MapPin size={17} />}
        label="Discover"
        onClick={() => navTo("home")}
      />
      <NavLink
        active={screen === "create"}
        icon={<Plus size={17} />}
        label="Create a vibe"
        onClick={() => navTo("create")}
      />
      <NavLink
        active={screen === "manage"}
        icon={<Users size={17} />}
        label="My vibes"
        onClick={() => navTo("manage")}
        {...(pendingRequestCount > 0 ? { count: pendingRequestCount } : {})}
      />
      <NavLink
        active={screen === "chat"}
        icon={<MessageCircle size={17} />}
        label="Crew chat"
        onClick={() => navTo("chat")}
      />
      <NavLink
        active={screen === "profile"}
        icon={<Heart size={17} />}
        label="My profile"
        onClick={() => navTo("profile")}
      />
      <div className="side-note">
        <div className="side-note-icon">
          <ShieldCheck size={16} />
        </div>
        <strong>Good vibes, no pressure.</strong>
        <p>Public places, verified people, and a crew that’s just your speed.</p>
      </div>
      {pendingRequestCount > 0 && (
        <button className="side-demo-link" onClick={() => navTo("manage")}>
          <span className="side-demo-dot" /> {pendingRequestCount} request
          {pendingRequestCount === 1 ? " needs" : "s need"} you <ArrowUpRight size={13} />
        </button>
      )}
    </aside>
  );
}

/** Bottom tab bar (mobile). */
export function BottomNav({ screen, navTo }: { screen: Screen; navTo: (target: Screen) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <MobileNavButton
        icon={<MapPin />}
        label="Home"
        active={screen === "home" || screen === "detail" || screen === "share"}
        onClick={() => navTo("home")}
      />
      <MobileNavButton
        icon={<Plus />}
        label="Create"
        active={screen === "create"}
        onClick={() => navTo("create")}
      />
      <MobileNavButton
        icon={<Users />}
        label="My vibes"
        active={screen === "manage"}
        onClick={() => navTo("manage")}
      />
      <MobileNavButton
        icon={<MessageCircle />}
        label="Chat"
        active={screen === "chat"}
        onClick={() => navTo("chat")}
      />
      <MobileNavButton
        icon={<Heart />}
        label="Profile"
        active={screen === "profile"}
        onClick={() => navTo("profile")}
      />
    </nav>
  );
}

function NavLink({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("side-nav-link", active && "side-nav-link-active")}
      aria-current={active ? "page" : undefined}
    >
      <span className="side-nav-icon">{icon}</span>
      <span>{label}</span>
      {count && <Badge className="nav-count">{count}</Badge>}
    </button>
  );
}

function MobileNavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("mobile-nav-button", active && "mobile-nav-active")}
      aria-current={active ? "page" : undefined}
    >
      <span className="mobile-nav-icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}