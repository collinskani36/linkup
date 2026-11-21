import { useEffect, useMemo, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { avatarFileProblem } from "@/lib/profile";

/**
 * Choose (or change, or remove) a profile picture. Nothing is uploaded here: the chosen file is
 * handed up and uploaded when the person saves.
 */
export function AvatarPicker({
  name,
  currentUrl,
  file,
  onFile,
  onRemove,
  hint,
}: {
  name: string;
  /** The picture that is saved right now, if any. */
  currentUrl: string;
  /** A newly chosen picture that hasn't been saved yet. */
  file: File | null;
  onFile: (file: File | null) => void;
  /** Called when the person removes their saved picture. */
  onRemove?: () => void;
  hint?: string;
}) {
  const [problem, setProblem] = useState("");
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const shown = preview ?? currentUrl;

  return (
    <div className="avatar-picker">
      <UserAvatar name={name || "You"} src={shown || null} className="avatar-picker-image" />
      <div className="avatar-picker-copy">
        <div className="avatar-picker-actions">
          <label className="upload-control">
            <input
              aria-label="Choose a profile picture"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (!chosen) return;
                const message = avatarFileProblem(chosen);
                setProblem(message);
                if (!message) onFile(chosen);
              }}
            />
            <span>
              <Camera size={13} /> {shown ? "Change photo" : "Add a photo"}
            </span>
          </label>
          {shown && onRemove && (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setProblem("");
                onFile(null);
                onRemove();
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
        {hint && <p className="field-hint">{hint}</p>}
        {problem && (
          <p className="form-error" role="alert">
            {problem}
          </p>
        )}
      </div>
    </div>
  );
}
