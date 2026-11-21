import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { ArrowUpRight, BadgeCheck, Check, LogOut, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvatarPicker } from "@/components/AvatarPicker";
import { LinkUpMark } from "@/components/LinkUpMark";
import { ProfileFields } from "@/components/ProfileFields";
import type { Profile } from "@/lib/linkup-data";
import {
  profileProblem,
  saveMyProfile,
  uploadAvatar,
  uploadVerificationDocs,
  type MyProfile,
  type VerificationStatus,
} from "@/lib/profile";

export default function SetupScreen({
  me,
  profile,
  setProfile,
  verification,
  setVerification,
  onDone,
  onSignOut,
}: {
  me: MyProfile;
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
  verification: VerificationStatus;
  setVerification: (status: VerificationStatus) => void;
  onDone: () => void;
  onSignOut: () => void;
}) {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const verificationLabel =
    verification === "verified"
      ? "Verified"
      : verification === "pending"
        ? "Under review"
        : "Not verified yet";

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = profileProblem(profile);
    if (problem) {
      setProfileError(problem);
      return;
    }
    setProfileError("");
    setSaving(true);
    try {
      const avatarUrl = avatarFile ? await uploadAvatar(me.id, avatarFile) : undefined;
      await saveMyProfile(me.id, profile, avatarUrl ? { avatarUrl } : {});
      if (avatarUrl) setProfile((current) => ({ ...current, avatarUrl }));
      if (idFile || selfieFile) {
        setVerification(await uploadVerificationDocs(me.id, { id: idFile, selfie: selfieFile }));
      }
      onDone();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Couldn’t save your profile. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="setup-page">
      <header className="setup-top">
        <button className="back-button" onClick={onSignOut} aria-label="Sign out">
          <LogOut size={17} />
        </button>
        <div className="brand-lockup">
          <LinkUpMark />
          <span>linkup</span>
        </div>
        <Badge className="verified-badge">
          <BadgeCheck size={13} /> {verificationLabel}
        </Badge>
      </header>
      <div className="setup-content">
        <div className="setup-intro">
          <p className="eyebrow accent-eyebrow">02 — THE LITTLE THINGS</p>
          <h1>
            What’s your kind
            <br />
            of good time?
          </h1>
          <p>Help your future crew get to know the real you.</p>
        </div>
        <form className="setup-form" onSubmit={saveProfile}>
          <div className="avatar-nudge">
            <AvatarPicker
              name={profile.name}
              currentUrl={profile.avatarUrl}
              file={avatarFile}
              onFile={setAvatarFile}
              hint="Optional, but hosts say yes faster when they can see a friendly face. You can add it later."
            />
          </div>
          <ProfileFields profile={profile} setProfile={setProfile} />
          {(verification === "unverified" || verification === "rejected") && (
            <div className="verification-box">
              <span className="verification-icon">
                <ShieldCheck size={18} />
              </span>
              <div className="verification-copy">
                <strong>Let’s keep it real.</strong>
                <span>
                  Add a photo of your ID &amp; a selfie for a safer crew (JPG, PNG or WebP, up to 5
                  MB).
                </span>
              </div>
              <label className="upload-control">
                <input
                  aria-label="Upload your ID"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                />
                <span>
                  {idFile ? <Check size={13} /> : <Plus size={13} />}
                  {idFile ? "ID added" : "Add ID"}
                </span>
              </label>
              <label className="upload-control">
                <input
                  aria-label="Upload a selfie"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                />
                <span>
                  {selfieFile ? <Check size={13} /> : <Plus size={13} />}
                  {selfieFile ? "Selfie added" : "Selfie"}
                </span>
              </label>
            </div>
          )}
          {profileError && (
            <p className="form-error" role="alert">
              {profileError}
            </p>
          )}
          <Button type="submit" className="primary-cta" disabled={saving}>
            {saving ? "Saving…" : "That’s me — find my crew"} <ArrowUpRight size={17} />
          </Button>
          <p className="signup-footnote">
            <ShieldCheck size={14} /> Verified. Seen. Ready for good company.
          </p>
        </form>
      </div>
    </main>
  );
}
