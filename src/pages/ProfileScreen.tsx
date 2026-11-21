import {
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Heart,
  LogOut,
  MapPin,
  Pencil,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import crewPhoto from "@/assets/linkup-crew.jpg";
import { PageHeading } from "@/components/LinkUpShared";
import { PickChips } from "@/components/PickChips";
import { UserAvatar } from "@/components/UserAvatar";
import type { Profile, Screen, Vibe } from "@/lib/linkup-data";

export default function ProfileScreen({
  profile,
  vibes,
  mineVibes,
  onSignOut,
  navTo,
}: {
  profile: Profile;
  vibes: Vibe[];
  mineVibes: Vibe[];
  onSignOut: () => void;
  navTo: (target: Screen) => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="THE PERSON BEHIND THE PLANS"
        title={
          <>
            A little about
            <br /> <span>you.</span>
          </>
        }
        subtitle="Good company starts with showing up as yourself."
        back={() => navTo("home")}
      />
      <section className="profile-card">
        <div className="profile-cover">
          <img
            src={crewPhoto}
            alt="A friendly group meeting over dinner"
            width={1440}
            height={912}
          />
          <div className="profile-cover-shade" />
        </div>
        <UserAvatar
          name={profile.name || "Wanjiku"}
          src={profile.avatarUrl || null}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h2>
            {profile.name || "Wanjiku Mwangi"}{" "}
            <BadgeCheck className="profile-verified-icon" size={19} />
          </h2>
          <p>
            <MapPin size={13} /> {profile.base || "Eldoret"} · {profile.age || "27"} · Verified
            member
          </p>
          {profile.bio ? (
            <p className="profile-bio">“{profile.bio}”</p>
          ) : (
            <p className="profile-bio">A friendly face, here for good food and better company.</p>
          )}
          <Button
            variant="outline"
            className="profile-edit-button"
            onClick={() => navTo("edit-profile")}
          >
            <Pencil size={13} /> Edit profile
          </Button>
          {!profile.avatarUrl && (
            <button className="avatar-nudge-banner" onClick={() => navTo("edit-profile")}>
              <Camera size={15} />
              <span>
                <strong>Add a profile picture.</strong> Hosts approve faster when they can see who’s
                asking.
              </span>
              <ChevronRight size={15} />
            </button>
          )}
          <div className="tag-row profile-tags">
            {(profile.interests.length ? profile.interests : ["Music", "Foodie", "Football"]).map(
              (tag) => (
                <Badge className="vibe-tag" key={tag}>
                  {tag}
                </Badge>
              ),
            )}
          </div>
          {(profile.genre.length > 0 || profile.mood.length > 0 || profile.drink.length > 0) && (
            <div className="pick-rows">
              <PickChips label="Music" picks={profile.genre} />
              <PickChips label="Vibe I love" picks={profile.mood} />
              <PickChips label="Drink style" picks={profile.drink} />
            </div>
          )}
        </div>
        <div className="profile-stats">
          <div>
            <strong>{vibes.filter((vibe) => vibe.isMember && !vibe.mine).length}</strong>
            <span>Vibes joined</span>
          </div>
          <div>
            <strong>
              4.8 <Star size={14} />
            </strong>
            <span>Your rating</span>
          </div>
          <div>
            <strong>
              <CheckCircle2 size={16} />
            </strong>
            <span>Shows up on time</span>
          </div>
        </div>
      </section>
      <section className="manage-section profile-activity">
        <div className="manage-section-heading">
          <div>
            <p className="eyebrow accent-eyebrow">THE GOOD THINGS</p>
            <h2>
              Your story so far<span>.</span>
            </h2>
          </div>
        </div>
        <div className="activity-row">
          <span className="activity-icon">
            <CalendarDays size={17} />
          </span>
          <div>
            <strong>Your hosted vibes</strong>
            <span>
              {mineVibes.length} local plans,{" "}
              {mineVibes.reduce((total, vibe) => total + vibe.memberCount, 0)} friendly faces.
            </span>
          </div>
          <button onClick={() => navTo("manage")} aria-label="Your hosted vibes">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="activity-row">
          <span className="activity-icon activity-pink">
            <Heart size={17} />
          </span>
          <div>
            <strong>Your join requests</strong>
            <span>
              {vibes.filter((vibe) => vibe.myRequest?.status === "pending").length} plans you’d love
              to be part of.
            </span>
          </div>
          <button onClick={() => navTo("manage")} aria-label="Your join requests">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="activity-row">
          <span className="activity-icon activity-green">
            <CheckCheck size={17} />
          </span>
          <div>
            <strong>Made it count</strong>
            <span>Show up, be kind, and the good company follows.</span>
          </div>
          <button onClick={() => navTo("manage")} aria-label="Your past plans">
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      <Button variant="outline" onClick={onSignOut} className="demo-reset">
        Log out <LogOut size={15} />
      </Button>
    </>
  );
}
