import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Choice, Question } from "@/components/LinkUpShared";
import { drinks, genres, interests, moods, type PickField, type Profile } from "@/lib/linkup-data";
import { MAX_PICKS } from "@/lib/profile";

/** The "what I like" questions, shared by the first-time setup and the edit-profile screen. */
export function ProfileFields({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: Dispatch<SetStateAction<Profile>>;
}) {
  const chooseInterests = (tag: string) => {
    setProfile((current) => ({
      ...current,
      interests: current.interests.includes(tag)
        ? current.interests.filter((item) => item !== tag)
        : current.interests.length < 3
          ? [...current.interests, tag]
          : current.interests,
    }));
  };
  const togglePick = (field: PickField, value: string) => {
    setProfile((current) => {
      const picked = current[field];
      if (picked.includes(value)) {
        return { ...current, [field]: picked.filter((item) => item !== value) };
      }
      if (picked.length >= MAX_PICKS) return current;
      return { ...current, [field]: [...picked, value] };
    });
  };

  const sections: { number: string; title: string; field: PickField; options: string[] }[] = [
    { number: "01", title: "Music genre", field: "genre", options: genres },
    { number: "02", title: "Vibe I love", field: "mood", options: moods },
    { number: "03", title: "Drink style", field: "drink", options: drinks },
  ];

  return (
    <>
      {sections.map(({ number, title, field, options }) => (
        <Question
          key={field}
          number={number}
          title={title}
          note={`Pick up to ${MAX_PICKS} · ${profile[field].length}/${MAX_PICKS}`}
        >
          <div className="choice-grid">
            {options.map((option) => (
              <Choice
                key={option}
                label={option}
                selected={profile[field].includes(option)}
                disabled={!profile[field].includes(option) && profile[field].length >= MAX_PICKS}
                onClick={() => togglePick(field, option)}
              />
            ))}
          </div>
        </Question>
      ))}
      <Question number="04" title="What are you into?" note="Pick 3 that feel like you.">
        <div className="choice-grid">
          {interests.map((interest) => (
            <Choice
              key={interest}
              label={interest}
              selected={profile.interests.includes(interest)}
              onClick={() => chooseInterests(interest)}
            />
          ))}
        </div>
      </Question>
      <Question number="05" title="One-line bio">
        <Input
          aria-label="One-line bio"
          placeholder="The friend who always brings the aux…"
          maxLength={100}
          value={profile.bio}
          onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
          className="form-input"
        />
      </Question>
    </>
  );
}
