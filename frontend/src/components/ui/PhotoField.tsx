import { useEffect, useRef, useState } from "react";
import { prepareImage } from "../../app/images";
import { ErrorText, Glyph, ProfilePhoto } from "./shared";
/** Photo picker with a preview. Pass `rim` (a sprite body colour) to preview a profile picture as a rimmed circle. */
export function PhotoField({
  label,
  value,
  onChange,
  required = false,
  onBusyChange,
  rim,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  onBusyChange?: (busy: boolean) => void;
  rim?: string;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const busyCallback = useRef(onBusyChange);
  busyCallback.current = onBusyChange;
  useEffect(
    () => () => {
      generation.current++;
      busyCallback.current?.(false);
    },
    [],
  );
  return (
    // Collect and process a photo while exposing preview, removal, and validation feedback.
    <div className="photo-field">
      <label>
        {label}
        {required ? " *" : ""}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            // Leave the current photo alone when the file picker is canceled.
            if (!file) return;
            const turn = ++generation.current;
            setBusy(true);
            onBusyChange?.(true);
            setError("");
            try {
              const image = await prepareImage(file);
              // Publish a processed photo only if no newer selection has superseded it.
              if (turn === generation.current) onChange(image);
            } catch (error) {
              // Show a processing error only for the most recent photo selection.
              if (turn === generation.current)
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not load this image.",
                );
            } finally {
              // Clear the processing indicator only for the most recent selection.
              if (turn === generation.current) {
                setBusy(false);
                onBusyChange?.(false);
              }
              // Reset the file input only while its DOM element still exists.
              if (input.current) input.current.value = "";
            }
          }}
        />
      </label>
      <small>JPEG, PNG or WebP · Up to 5 MB</small>
      {busy && <p role="status">Preparing photo…</p>}
      {value ? (
        <div className="photo-preview">
          {rim ? (
            <ProfilePhoto
              src={value}
              bodyColor={rim}
              size={120}
              label={label}
              className="photo-preview__profile"
            />
          ) : (
            <img src={value} alt={label} />
          )}
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => {
              generation.current++;
              onChange("");
            }}
          >
            Remove photo
          </button>
        </div>
      ) : (
        <div className="photo-placeholder" aria-hidden="true">
          <Glyph name="camera" size={32} />
        </div>
      )}
      <ErrorText text={error} />
    </div>
  );
}
