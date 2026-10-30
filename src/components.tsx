import { useEffect, useRef, useState, type ReactNode } from "react";
import { Box, ImageIcon, UserRound, X } from "lucide-react";
import { db } from "./lib/supabase";
import type { Sprite } from "./lib/model";

export function SpriteBadge({
  sprite,
  large = false,
}: {
  sprite?: Sprite;
  large?: boolean;
}) {
  const Icon = sprite?.category === "user" ? UserRound : Box;
  return (
    <div
      className={`sprite ${large ? "sprite-large" : ""}`}
      style={
        {
          "--sprite-colour": sprite?.colour || "#879c87",
        } as React.CSSProperties
      }
      aria-label={`${sprite?.category || "item"} sprite placeholder`}
    >
      <Icon strokeWidth={1.5} />
    </div>
  );
}

export function StorageImage({
  bucket,
  path,
  alt,
  className = "",
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
    <img src={url} alt={alt} className={className} onError={() => setUrl("")} />
  ) : (
    <div className={`image-placeholder ${className}`}>
      <ImageIcon aria-hidden="true" />
      <span>{alt}</span>
    </div>
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
      className="modal"
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
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
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
      <small>JPEG, PNG, or WebP · Up to 5 MB</small>
    </label>
  );
}
