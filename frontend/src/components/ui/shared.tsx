import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Icon } from "../Icon";
import { useApp, useOptionalApp } from "../../app/context";
import { spriteFor } from "../../app/sprite";
import { SpriteAvatar } from "../sprites/SpriteAvatar";
import { deriveSpritePalette, SWATCH_HEX } from "../sprites/palette";
import type { Page } from "../../app/routes";
import { defaultSpriteColour, spriteOf, type Person } from "../../app/domain";
export function Glyph({
  name,
  size = 20,
}: {
  name:
    | "calendar"
    | "edit"
    | "qr"
    | "camera"
    | "plus"
    | "send"
    | "star"
    | "chevron"
    | "check"
    | "borrow";
  size?: number;
}) {
  const paths = {
    borrow:
      "M3 10h18v12H3V10ZM2 10l2-8h16l2 8M2 10c1 4 4 4 5 0 1 4 4 4 5 0 1 4 4 4 5 0 1 4 4 4 5 0M8 2l-1 8M16 2l1 8",
    calendar:
      "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    edit: "m14 3 7 7M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16l-1 5Z",
    qr: "M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h2v2H8zM15 8h2v2h-2zM8 15h2v2H8zM15 15h2v2h-2z",
    camera:
      "M8 5l2-3h4l2 3h4a2 2 0 0 1 2 2v13H2V7a2 2 0 0 1 2-2h4ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    plus: "M12 4v16M4 12h16",
    send: "m3 3 19 9-19 9 4-9-4-9ZM7 12h15",
    star: "m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1 3-6Z",
    chevron: "m9 4 8 8-8 8",
    check: "m4 12 5 5L20 5",
  };
  return (
    // Draw a small interface glyph using the selected SVG path.
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Modal({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    // Use a native dialog for modal focus handling, cancellation, and backdrop dismissal.
    <dialog
      className={`app-modal ${className}`}
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Dismiss only a direct backdrop click, not clicks inside the dialog.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="plain-icon"
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Icon name="clear-search" width={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  text,
  onClose,
  onConfirm,
}: {
  title: string;
  text: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    // Present a confirm-or-cancel decision with saving-state protection.
    <Modal title={title} onClose={onClose}>
      <p>{text}</p>
      <div className="form-actions">
        <button className="button" type="button" onClick={onClose}>
          Keep it
        </button>
        <button className="button danger" type="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}
/**
 * A person's round avatar. Their profile picture if they've added one (rimmed in
 * their sprite colour), otherwise their sprite colour and face.
 */
export function Avatar({
  person,
  size = 36,
  label,
  prefer = "photo",
}: {
  person: Person;
  size?: number;
  label?: string;
  prefer?: "photo" | "sprite";
}) {
  const app = useOptionalApp();
  const sprite = app
    ? spriteFor(app.store, person.id)
    : {
        bodyColor:
          SWATCH_HEX[
            spriteOf(person)?.colour ?? defaultSpriteColour(person.id)
          ],
        face: { kind: "default" } as const,
      };
  if (prefer === "photo" && person.avatar)
    return (
      <ProfilePhoto
        src={person.avatar}
        bodyColor={sprite.bodyColor}
        size={size}
        label={label}
      />
    );
  return (
    <SpriteAvatar
      bodyColor={sprite.bodyColor}
      face={sprite.face}
      size={size}
      label={label}
    />
  );
}
/** A profile picture in a circle, with a rim in the person's sprite colour (and its outline colour around that). */
export function ProfilePhoto({
  src,
  bodyColor,
  size = 36,
  label,
  className = "",
}: {
  src: string;
  bodyColor: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  const palette = deriveSpritePalette(bodyColor);
  const style = {
    width: size,
    height: size,
    borderWidth: Math.max(2, Math.round(size / 14)),
    "--rim": palette.body,
    "--rim-outline": palette.outline,
  } as CSSProperties;
  return (
    <span
      className={`avatar photo-avatar ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src={src} alt="" draggable={false} />
    </span>
  );
}
export function ErrorText({ text }: { text: string }) {
  return text ? (
    <p className="form-error" role="alert">
      {text}
    </p>
  ) : null;
}
export function EmptyState({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    // Explain an empty result and optionally offer a recovery action.
    <div className="app-empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Header({
  title,
  onBack,
  navigate,
}: {
  title: string;
  onBack?: () => void;
  navigate: (page: Page, id?: string) => void;
}) {
  const { store } = useApp();
  const count = store.notices.filter(
    (n) => n.to === store.activeUserId && !n.read,
  ).length;
  return (
    // Combine the page title with optional back, chat, and notification controls.
    <header className="app-header">
      {onBack && (
        <button
          className="plain-icon"
          type="button"
          aria-label="Go back"
          onClick={onBack}
        >
          <Icon name="back" width={24} />
        </button>
      )}
      <h1 tabIndex={-1}>{title}</h1>
      <div className="app-header-actions">
        <button
          type="button"
          className="header-action badge-button"
          aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
          onClick={() => navigate("notifications")}
        >
          <Icon name="notifications" width={35} />
          {count > 0 && (
            <span className="badge">{count > 9 ? "9+" : count}</span>
          )}
        </button>
        <button
          type="button"
          className="header-action"
          aria-label="Chats"
          onClick={() => navigate("chats")}
        >
          <Icon name="chat" width={35} />
        </button>
      </div>
    </header>
  );
}
