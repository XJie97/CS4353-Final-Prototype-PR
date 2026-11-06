import { useEffect, useRef, useState } from "react";
import { prepareImage } from "../../app/images";
import { ErrorText, Glyph } from "./shared";
export function PhotoField({
  label,
  value,
  onChange,
  required = false,
  onBusyChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  onBusyChange?: (busy: boolean) => void;
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
            if (!file) return;
            const turn = ++generation.current;
            setBusy(true);
            onBusyChange?.(true);
            setError("");
            try {
              const image = await prepareImage(file);
              if (turn === generation.current) onChange(image);
            } catch (error) {
              if (turn === generation.current)
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not load this image.",
                );
            } finally {
              if (turn === generation.current) {
                setBusy(false);
                onBusyChange?.(false);
              }
              if (input.current) input.current.value = "";
            }
          }}
        />
      </label>
      <small>JPEG, PNG or WebP · Up to 5 MB</small>
      {busy && <p role="status">Preparing photo…</p>}
      {value ? (
        <div className="photo-preview">
          <img src={value} alt={label} />
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
