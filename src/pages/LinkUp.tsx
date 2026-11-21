import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleHelp } from "lucide-react";

import { AppHeader, BottomNav, SideNav } from "@/components/LinkUpNav";
import { RightRail } from "@/components/RightRail";
import {
  applicantsKey,
  useApplicants,
  useCreateVibe,
  useJoinActions,
  useJoinRequestUpdates,
  useVibes,
  vibesKey,
} from "@/hooks/use-vibes";
import {
  accessOptions,
  blankDraft,
  blankProfile,
  type Profile,
  type Screen,
  type Vibe,
  type VibeDraft,
} from "@/lib/linkup-data";
import { clearPendingInvite, takePendingInvite } from "@/lib/invite";
import { isPublicVenue } from "@/lib/linkup";
import { isInFuture, matchesTimeFilter, toStartsAt } from "@/lib/vibe-time";
import { VENUE_ERROR, type Applicant } from "@/lib/vibes";
import { type MyProfile, type VerificationStatus } from "@/lib/profile";
import ChatScreen from "@/pages/ChatScreen";
import CreateScreen from "@/pages/CreateScreen";
import DetailScreen from "@/pages/DetailScreen";
import EditProfileScreen from "@/pages/EditProfileScreen";
import HomeScreen from "@/pages/HomeScreen";
import ManageScreen from "@/pages/ManageScreen";
import ProfileScreen from "@/pages/ProfileScreen";
import SetupScreen from "@/pages/SetupScreen";
import ShareScreen from "@/pages/ShareScreen";

/**
 * The LinkUp app shell. It owns the state that several screens share (who you are, the vibes,
 * the chat) and the handlers that change it, then hands the right pieces to each screen.
 */
export default function LinkUp({ me, onSignOut }: { me: MyProfile; onSignOut: () => void }) {
  const [screen, setScreen] = useState<Screen>(me.setupDone ? "home" : "setup");
  const [profile, setProfile] = useState<Profile>({ ...blankProfile, ...me.profile });
  const [verification, setVerification] = useState<VerificationStatus>(me.verification);
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("All vibes");
  const [typeFilter, setTypeFilter] = useState("Any vibe");
  const [budgetFilter, setBudgetFilter] = useState("Any budget");
  const [draft, setDraft] = useState<VibeDraft>(blankDraft);
  const [venueError, setVenueError] = useState("");
  const [toast, setToast] = useState("");
  const [chatVibeId, setChatVibeId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { vibes, isLoading, isError, refetch } = useVibes(me.id);
  const createVibeMutation = useCreateVibe(me.id);
  const { applicants } = useApplicants(me.id);
  const joinActions = useJoinActions(me.id);
  useJoinRequestUpdates(me.id);

  const selectedVibe = vibes.find((vibe) => vibe.id === selectedVibeId);
  const mineVibes = vibes.filter((vibe) => vibe.mine);
  const pendingRequestCount = applicants.length;
  const filteredVibes = vibes.filter((vibe) => {
    if (!matchesTimeFilter(vibe.startsAt, timeFilter)) return false;
    if (typeFilter !== "Any vibe" && vibe.vibeType !== typeFilter) return false;
    if (budgetFilter === "Under Ksh 500" && vibe.budget >= 500) return false;
    if (budgetFilter === "Under Ksh 1,000" && vibe.budget >= 1000) return false;
    return true;
  });
  // Every crew you're in. The chat opens on the one you picked there, else the vibe you were
  // just looking at (if you're in it), else your first crew.
  const crews = vibes.filter((vibe) => vibe.isMember);
  const chatVibe =
    crews.find((vibe) => vibe.id === chatVibeId) ??
    (selectedVibe?.isMember ? selectedVibe : undefined) ??
    crews[0];

  const navTo = (target: Screen) => setScreen(target);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  const openDetail = (vibe: Vibe) => {
    setSelectedVibeId(vibe.id);
    setChatVibeId(null);
    setScreen("detail");
  };
  // Opened from a shared link? Once the plans have loaded (and setup is out of the way), jump to it.
  useEffect(() => {
    if (screen === "setup" || isLoading || isError) return;
    const invitedId = takePendingInvite();
    if (!invitedId) return;
    clearPendingInvite();
    const invited = vibes.find((vibe) => vibe.id === invitedId);
    if (invited) openDetail(invited);
    else notify("That plan isn’t on the line-up any more.");
    // openDetail and notify only set state, so they don't need to re-run this.
  }, [screen, isLoading, isError, vibes]);
  const failureMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  const requestToJoin = async () => {
    if (!selectedVibe) return;
    if (selectedVibe.mine) {
      setScreen("manage");
      return;
    }
    if (joinActions.request.isPending) return;
    try {
      await joinActions.request.mutateAsync(selectedVibe.id);
      notify("Request sent — you’re on their radar.");
    } catch (error) {
      notify(failureMessage(error));
    }
  };
  const cancelRequest = async () => {
    const requestId = selectedVibe?.myRequest?.id;
    if (!requestId || joinActions.cancel.isPending) return;
    try {
      await joinActions.cancel.mutateAsync(requestId);
      notify("Request cancelled.");
    } catch (error) {
      notify(failureMessage(error));
    }
  };
  const decideRequest = async (applicant: Applicant, decision: "approve" | "decline") => {
    const action = decision === "approve" ? joinActions.approve : joinActions.decline;
    if (action.isPending) return;
    try {
      await action.mutateAsync(applicant.requestId);
      notify(
        decision === "approve"
          ? `${applicant.name} is in the crew.`
          : `Declined — ${applicant.name} has been let know.`,
      );
    } catch (error) {
      notify(failureMessage(error));
    }
  };
  const submitVibe = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createVibeMutation.isPending) return;
    setVenueError("");

    if (!isPublicVenue(draft.venue)) {
      setVenueError(VENUE_ERROR);
      return;
    }
    const typedVenue = draft.venue.trim();
    const venue = /eldoret/i.test(typedVenue) ? typedVenue : `${typedVenue}, Eldoret`;
    if (venue.length > 120) {
      setVenueError("That venue name is a bit long. Keep it under 120 characters.");
      return;
    }

    if (!draft.date) {
      notify("Pick a date for your vibe.");
      return;
    }
    const startsAt = toStartsAt(draft.date, draft.time);
    if (!startsAt) {
      notify("Pick a start time.");
      return;
    }
    if (!isInFuture(startsAt)) {
      notify("Pick a start time in the future.");
      return;
    }

    const title = draft.title.trim() || `${draft.type} & good company`;
    if (title.length < 3 || title.length > 80) {
      notify("Give your vibe a name between 3 and 80 characters.");
      return;
    }
    const budget = draft.budget.trim() === "" ? 500 : Math.round(Number(draft.budget));
    if (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000) {
      notify("Enter a budget between Ksh 0 and 1,000,000.");
      return;
    }
    const size = Number(draft.size);
    if (!Number.isInteger(size) || size < 2 || size > 30) {
      notify("Pick a crew size.");
      return;
    }
    if (!accessOptions.includes(draft.gender)) {
      notify("Pick who can join.");
      return;
    }

    try {
      const id = await createVibeMutation.mutateAsync({
        title,
        venue,
        startsAt,
        budget,
        vibeType: draft.type,
        size,
        access: draft.gender,
        description:
          draft.description.trim() ||
          "Good people, a public spot, and a plan that feels easy. No pressure — just good vibes.",
      });
      setSelectedVibeId(id);
      setChatVibeId(null);
      setDraft((current) => ({
        ...current,
        title: "",
        venue: "",
        date: undefined,
        description: "",
      }));
      setScreen("share");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn’t create your vibe. Please try again.";
      if (message === VENUE_ERROR) setVenueError(message);
      else notify(message);
    }
  };
  if (screen === "setup") {
    return (
      <SetupScreen
        me={me}
        profile={profile}
        setProfile={setProfile}
        verification={verification}
        setVerification={setVerification}
        onDone={() => setScreen("home")}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        base={profile.base}
        profileName={profile.name}
        avatarUrl={profile.avatarUrl}
        navTo={navTo}
      />

      <div className="app-layout">
        <SideNav screen={screen} pendingRequestCount={pendingRequestCount} navTo={navTo} />

        <main className="main-column">
          {screen === "home" && (
            <HomeScreen
              filteredVibes={filteredVibes}
              timeFilter={timeFilter}
              typeFilter={typeFilter}
              budgetFilter={budgetFilter}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              setTimeFilter={setTimeFilter}
              setTypeFilter={setTypeFilter}
              setBudgetFilter={setBudgetFilter}
              notify={notify}
              openDetail={openDetail}
              navTo={navTo}
            />
          )}
          {screen === "create" && (
            <CreateScreen
              draft={draft}
              setDraft={setDraft}
              venueError={venueError}
              setVenueError={setVenueError}
              onSubmit={(event) => void submitVibe(event)}
              navTo={navTo}
            />
          )}
          {screen === "share" && (
            <ShareScreen selectedVibe={selectedVibe} notify={notify} navTo={navTo} />
          )}
          {screen === "detail" && (
            <DetailScreen
              selectedVibe={selectedVibe}
              meId={me.id}
              notify={notify}
              requestToJoin={() => void requestToJoin()}
              requestBusy={joinActions.request.isPending}
              cancelRequest={() => void cancelRequest()}
              cancelBusy={joinActions.cancel.isPending}
              navTo={navTo}
            />
          )}
          {screen === "manage" && (
            <ManageScreen
              vibes={vibes}
              mineVibes={mineVibes}
              applicants={applicants}
              decidingRequestId={
                joinActions.approve.isPending
                  ? (joinActions.approve.variables ?? null)
                  : joinActions.decline.isPending
                    ? (joinActions.decline.variables ?? null)
                    : null
              }
              onApprove={(applicant) => void decideRequest(applicant, "approve")}
              onDecline={(applicant) => void decideRequest(applicant, "decline")}
              openDetail={openDetail}
              navTo={navTo}
            />
          )}
          {screen === "chat" && (
            <ChatScreen
              crews={crews}
              activeCrew={chatVibe}
              meId={me.id}
              onPickCrew={setChatVibeId}
              notify={notify}
              openDetail={openDetail}
              navTo={navTo}
            />
          )}
          {screen === "profile" && (
            <ProfileScreen
              profile={profile}
              vibes={vibes}
              mineVibes={mineVibes}
              onSignOut={onSignOut}
              navTo={navTo}
            />
          )}
          {screen === "edit-profile" && (
            <EditProfileScreen
              me={me}
              profile={profile}
              verification={verification}
              onSaved={(saved) => {
                setProfile(saved);
                void queryClient.invalidateQueries({ queryKey: vibesKey });
                void queryClient.invalidateQueries({ queryKey: applicantsKey(me.id) });
              }}
              notify={notify}
              navTo={navTo}
            />
          )}
        </main>

        <RightRail
          profileName={profile.name}
          avatarUrl={profile.avatarUrl}
          applicants={applicants}
          crewVibe={chatVibe}
          navTo={navTo}
        />
      </div>

      <BottomNav screen={screen} navTo={navTo} />
      {toast && (
        <div className="toast-message" role="status">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
      <button
        className="help-button"
        aria-label="Community promise"
        onClick={() => notify("Public places. Good people. No pressure.")}
      >
        <CircleHelp size={16} />
      </button>
    </div>
  );
}
