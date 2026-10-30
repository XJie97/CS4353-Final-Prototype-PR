import { useEffect, useRef, useState, type ReactNode } from "react";
import { db } from "./lib/supabase";

// Uploaded files are opened explicitly instead of displayed as thumbnails.
export function StorageImage({
  bucket,
  path,
  alt,
}: {
  bucket: string;
  path: string | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path)
      void db()
        .storage.from(bucket)
        .createSignedUrl(path, 600)
        .then(({ data }) => {
          if (active) setUrl(data?.signedUrl || "");
        });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      View {alt}
    </a>
  ) : (
    <span>{alt}: unavailable</span>
  );
}

export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button type="button" aria-label="Close dialog" onClick={close}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <p>
        <strong>{title}</strong>
      </p>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Pill({ children }: { children: ReactNode; tone?: string }) {
  return <span className="pill">{children}</span>;
}

export function FileField({
  label,
  onChange,
  required = false,
}: {
  label: string;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <small>JPEG, PNG, or WebP. Up to 5 MB.</small>
    </label>
  );
}
