import { useState, type FormEvent } from "react";
import { ArrowUpRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarPicker } from "@/components/AvatarPicker";
import { ProfileFields } from "@/components/ProfileFields";
import { PageHeading } from "@/components/LinkUpShared";
import type { Profile, Screen } from "@/lib/linkup-data";
import {
  profileProblem,
  saveMyProfile,
  uploadAvatar,
  type MyProfile,
  type VerificationStatus,
} from "@/lib/profile";

export default function EditProfileScreen({
  me,
  profile,
  verification,
  onSaved,
  notify,
  navTo,
}: {
  me: MyProfile;
  profile: Profile;
  verification: VerificationStatus;
  /** Called with the saved profile so the rest of the app shows the new details straight away. */
  onSaved: (saved: Profile) => void;
  notify: (message: string) => void;
  navTo: (target: Screen) => void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Once ID-verified, name and age stay as they were checked.
  const identityLocked = verification === "verified";

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const name = draft.name.trim();
    if (!identityLocked && (name.length < 1 || name.length > 60)) {
      setError("Your name should be between 1 and 60 characters.");
      return;
    }
    let age: number | null | undefined;
    if (!identityLocked) {
      if (draft.age.trim() === "") {
        age = profile.age.trim() === "" ? undefined : null;
      } else {
        age = Number(draft.age);
        if (!Number.isInteger(age) || age < 18 || age > 100) {
          setError("LinkUp is for adults. Enter an age between 18 and 100.");
          return;
        }
      }
    }
    const problem = profileProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) avatarUrl = await uploadAvatar(me.id, avatarFile);
      else if (draft.avatarUrl !== profile.avatarUrl) avatarUrl = draft.avatarUrl;

      await saveMyProfile(me.id, draft, {
        ...(identityLocked ? {} : { name, age }),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });
      onSaved({
        ...draft,
        name: identityLocked ? profile.name : name,
        age: identityLocked || age === undefined ? profile.age : age === null ? "" : String(age),
        avatarUrl: avatarUrl ?? draft.avatarUrl,
      });
      notify("Profile updated.");
      navTo("profile");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Couldn’t save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title={
          <>
            Edit your
            <br /> <span>profile.</span>
          </>
        }
        subtitle="Keep it real. This is what hosts and crews see."
        back={() => navTo("profile")}
      />
      <form className="create-form" onSubmit={(event) => void save(event)}>
        <span className="field-label">Profile picture</span>
        <AvatarPicker
          name={draft.name}
          currentUrl={draft.avatarUrl}
          file={avatarFile}
          onFile={setAvatarFile}
          onRemove={() => setDraft((current) => ({ ...current, avatarUrl: "" }))}
          hint="A clear photo of your face works best. JPG, PNG or WebP."
        />
        <label className="field-label" htmlFor="edit-name">
          Name
        </label>
        <Input
          id="edit-name"
          value={draft.name}
          maxLength={60}
          disabled={identityLocked}
          onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          className="form-input"
        />
        <label className="field-label" htmlFor="edit-age">
          Age
        </label>
        <Input
          id="edit-age"
          type="number"
          inputMode="numeric"
          min="18"
          max="100"
          value={draft.age}
          disabled={identityLocked}
          onChange={(event) => setDraft((current) => ({ ...current, age: event.target.value }))}
          className="form-input"
        />
        {identityLocked && (
          <p className="field-hint">
            <Lock size={13} /> Name and age are locked once you’re verified.
          </p>
        )}
        <label className="field-label" htmlFor="edit-base">
          Where are you based?
        </label>
        <Input
          id="edit-base"
          value={draft.base}
          maxLength={60}
          onChange={(event) => setDraft((current) => ({ ...current, base: event.target.value }))}
          className="form-input"
        />
        <div className="setup-form">
          <ProfileFields profile={draft} setProfile={setDraft} />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" className="primary-cta" disabled={saving}>
          {saving ? "Saving…" : "Save changes"} <ArrowUpRight size={17} />
        </Button>
        <button type="button" className="text-link" onClick={() => navTo("profile")}>
          Cancel
        </button>
      </form>
    </>
  );
}
