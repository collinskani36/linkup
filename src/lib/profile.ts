import { supabase } from "@/lib/supabase";

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";

/** Most picks allowed per "what I like" section (genre, vibe, drink). Matches the DB check. */
export const MAX_PICKS = 3;

/** Shape the LinkUp page edits (age is a string because it comes from an input). */
export type ProfileForm = {
  name: string;
  age: string;
  phone: string;
  base: string;
  genre: string[];
  mood: string[];
  drink: string[];
  interests: string[];
  bio: string;
  /** Public URL of the profile picture, or "" when none has been added. */
  avatarUrl: string;
};

export type MyProfile = {
  id: string;
  username: string;
  profile: ProfileForm;
  verification: VerificationStatus;
  /** True once the "little things" setup (3 interests + bio) has been saved. */
  setupDone: boolean;
};

export async function fetchMyProfile(userId: string): Promise<MyProfile> {
  const [profileRes, privateRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("profile_private")
      .select("phone, verification_status")
      .eq("user_id", userId)
      .single(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (privateRes.error) throw privateRes.error;

  const p = profileRes.data;
  const interests: string[] = p.interests ?? [];

  return {
    id: userId,
    username: p.username,
    profile: {
      name: p.name,
      age: p.age == null ? "" : String(p.age),
      phone: privateRes.data.phone,
      base: p.base,
      genre: p.genre ?? [],
      mood: p.mood ?? [],
      drink: p.drink ?? [],
      interests,
      bio: p.bio,
      avatarUrl: p.avatar_url ?? "",
    },
    verification: privateRes.data.verification_status as VerificationStatus,
    setupDone: interests.length === 3 && p.bio.trim().length > 0,
  };
}

/** Why a profile can't be saved yet, or "" when it is complete. Used by setup and edit-profile. */
export function profileProblem(profile: ProfileForm): string {
  if (!profile.genre.length || !profile.mood.length || !profile.drink.length) {
    return `Pick at least one music genre, vibe and drink style (up to ${MAX_PICKS} each).`;
  }
  if (profile.interests.length !== 3 || !profile.bio.trim()) {
    return "Choose 3 interests and add a one-line bio to continue.";
  }
  return "";
}

/** Extra columns the edit-profile screen can change (setup leaves these alone). */
export type ProfileExtras = { name?: string; age?: number | null; avatarUrl?: string };

export async function saveMyProfile(
  userId: string,
  form: ProfileForm,
  extras: ProfileExtras = {},
): Promise<void> {
  const patch: Record<string, unknown> = {
    base: form.base.trim() || "Eldoret",
    genre: form.genre,
    mood: form.mood,
    drink: form.drink,
    interests: form.interests,
    bio: form.bio.trim(),
  };
  if (extras.name !== undefined) patch.name = extras.name.trim();
  if (extras.age !== undefined) patch.age = extras.age;
  if (extras.avatarUrl !== undefined) patch.avatar_url = extras.avatarUrl || null;

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error("Couldn’t save your profile. Please try again.");
}

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadOne(userId: string, kind: "id" | "selfie", file: File): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new Error("Please upload a JPG, PNG or WebP photo.");
  if (file.size > MAX_BYTES) throw new Error("That photo is over 5 MB. Try a smaller one.");

  const path = `${userId}/${kind}.${ext}`;
  const { error } = await supabase.storage
    .from("verification")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error("Couldn’t upload your photo. Please try again.");
  return path;
}

/** Uploads the chosen photos to the private bucket. Returns the new review status. */
export async function uploadVerificationDocs(
  userId: string,
  files: { id: File | null; selfie: File | null },
): Promise<VerificationStatus> {
  const patch: { id_doc_path?: string; selfie_path?: string } = {};
  if (files.id) patch.id_doc_path = await uploadOne(userId, "id", files.id);
  if (files.selfie) patch.selfie_path = await uploadOne(userId, "selfie", files.selfie);

  const { data, error } = await supabase
    .from("profile_private")
    .update(patch)
    .eq("user_id", userId)
    .select("verification_status")
    .single();
  if (error) throw new Error("Couldn’t save your verification photos. Please try again.");
  return data.verification_status as VerificationStatus;
}

// ---- Profile picture --------------------------------------------------------------------------

const AVATAR_SIZE = 512;
const MAX_AVATAR_INPUT_BYTES = 10 * 1024 * 1024;

/** Crops the middle square out of the photo and shrinks it, so uploads stay small and fast. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn’t read that photo. Try a different one.");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Couldn’t read that photo. Try a different one.")),
      "image/jpeg",
      0.85,
    ),
  );
}

/** Checks a chosen picture before it is shown or uploaded. Returns an error message, or "". */
export function avatarFileProblem(file: File): string {
  if (!EXTENSIONS[file.type]) return "Please choose a JPG, PNG or WebP photo.";
  if (file.size > MAX_AVATAR_INPUT_BYTES) return "That photo is over 10 MB. Try a smaller one.";
  return "";
}

/**
 * Uploads a profile picture to the public "avatars" bucket and returns its URL. The URL carries a
 * version stamp so a replaced picture shows up straight away instead of the cached old one.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const problem = avatarFileProblem(file);
  if (problem) throw new Error(problem);

  const blob = await toSquareJpeg(file);
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
  if (error) throw new Error("Couldn’t upload your picture. Please try again.");

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
