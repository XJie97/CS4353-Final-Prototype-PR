import { useEffect, useRef, useState } from "react";
import { useApp } from "../app/context";
import { dateLabel, type Loan } from "../app/domain";
import {
  Avatar,
  EmptyState,
  ErrorText,
  Glyph,
  Modal,
} from "../components/ui/shared";
import { LoanForm } from "./LoanForm";
import { statusLabel } from "./LoansPage";

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatsPage({
  peerId,
  onOpen,
  onLoan,
}: {
  peerId?: string;
  onOpen: (id: string) => void;
  onLoan: (id: string) => void;
}) {
  const { store, perform, toast, busy: saving } = useApp();
  const me = store.activeUserId;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [compose, setCompose] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const peer = store.people.find((p) => p.id === peerId && p.id !== me);
  const messages = peer
    ? store.messages.filter(
        (m) =>
          (m.from === me && m.to === peer.id) ||
          (m.from === peer.id && m.to === me),
      )
    : [];
  const unread = peer
    ? messages.some((m) => m.to === me && !m.read) ||
      store.notices.some((n) => n.to === me && n.peerId === peer.id && !n.read)
    : false;

  useEffect(() => {
    // Mark a thread read only when it has a valid peer and unread messages.
    if (peer && unread)
      void perform({ type: "read-thread", peerId: peer.id }).then((r) => {
        // Surface a failure to mark the conversation as read.
        if (!r.ok) setError(r.error);
      });
  }, [peerId, unread]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [peerId, messages.length]);

  const related = peer
    ? store.loans.filter(
        (l) =>
          (l.ownerId === me && l.borrowerId === peer.id) ||
          (l.ownerId === peer.id && l.borrowerId === me),
      )
    : [];

  // Show an unavailable-person state for an invalid conversation deep link.
  if (peerId && !peer)
    return (
      // Explain an unavailable conversation without rendering a broken thread.
      <main className="app-scroll">
        <EmptyState
          title="Conversation unavailable"
          text="Choose another person to start a conversation."
        />
      </main>
    );

  // Show the conversation list when no peer is selected.
  if (!peer) {
    const ids = [
      ...new Set(
        store.messages
          .filter((m) => m.from === me || m.to === me)
          .map((m) => (m.from === me ? m.to : m.from)),
      ),
    ];
    return (
      // Show existing conversations and people available to start a new conversation.
      <main className="app-scroll">
        <div className="section-heading">
          <h2>Messages</h2>
          <button
            disabled={saving}
            className="button"
            type="button"
            onClick={() => setCompose(true)}
          >
            <Glyph name="plus" />
            New chat
          </button>
        </div>

        {ids.length ? (
          ids.map((id) => {
            const person = store.people.find((p) => p.id === id)!;
            const thread = store.messages.filter(
              (m) =>
                (m.from === me && m.to === id) ||
                (m.to === me && m.from === id),
            );
            const last = thread.at(-1)!;
            const count = thread.filter((m) => m.to === me && !m.read).length;
            return (
              // Represent one conversation with its peer, latest message, and unread state.
              <button
                disabled={saving}
                className="conversation-row"
                key={id}
                type="button"
                onClick={() => onOpen(id)}
              >
                <Avatar person={person} size={46} />
                <span>
                  <strong>{person.name}</strong>
                  <span className="conversation-preview">
                    {last.from === me ? "You: " : ""}
                    {last.text}
                  </span>
                </span>
                <span className="conversation-meta">
                  {timeLabel(last.at)}
                  {count > 0 && <span className="unread-count">{count}</span>}
                </span>
              </button>
            );
          })
        ) : (
          <EmptyState
            title="No messages yet"
            text="Start a chat with a neighbour or ask about an item."
          />
        )}
        {compose && (
          <Modal title="New conversation" onClose={() => setCompose(false)}>
            <div className="person-list">
              {store.people
                .filter((p) => p.id !== me)
                .map((person) => (
                  // Offer a person as the recipient of a new conversation.
                  <button
                    disabled={saving}
                    className="person-row"
                    type="button"
                    key={person.id}
                    onClick={() => {
                      setCompose(false);
                      onOpen(person.id);
                    }}
                  >
                    <Avatar person={person} />
                    <strong>{person.name}</strong>
                    <Glyph name="chevron" size={16} />
                  </button>
                ))}
            </div>
          </Modal>
        )}
      </main>
    );
  }

  const loanCard = (loan: Loan) => (
    // Summarize a related loan with the actions available at its current stage.
    <article className="chat-loan-card" key={loan.id}>
      <strong>
        {store.items.find((i) => i.id === loan.itemId)?.title ??
          store.items.find((i) => i.id === loan.itemId)?.name}
      </strong>
      <p>
        {dateLabel(loan.start)} – {dateLabel(loan.end)}
      </p>
      <span className="status-label">{statusLabel[loan.status]}</span>
      <div className="button-row">
        <button
          disabled={saving}
          className="button"
          type="button"
          onClick={() => onLoan(loan.id)}
        >
          View loan
        </button>

        {["requested", "arranging", "ready"].includes(loan.status) &&
          !loan.proofs.ownerDropoff && (
            <button
              disabled={saving}
              className="button accent"
              type="button"
              onClick={() => setEditing(loan)}
            >
              Modify plan
            </button>
          )}

        {loan.status === "requested" && loan.ownerId === me && (
          <button
            disabled={saving}
            className="button primary"
            type="button"
            onClick={async () => {
              const result = await perform({
                type: "approve-plan",
                loanId: loan.id,
              });
              // Show the request-accepted toast only after the approval command succeeds.
              if (result.ok) toast("Request accepted.");
              else setError(result.error);
            }}
          >
            Accept request
          </button>
        )}
      </div>
    </article>
  );

  return (
    // Combine the selected conversation, related loans, and message composer.
    <>
      <main className="app-scroll chat-thread">
        <div className="chat-person">
          <Avatar person={peer} />
          <div>
            <strong>{peer.name}</strong>
            <p>{peer.location}</p>
          </div>
        </div>

        {related[0] && loanCard(related[0])}
        {related.length > 1 && (
          <details className="older-loans">
            <summary>
              {related.length - 1} other loans with {peer.name}
            </summary>
            {related.slice(1).map(loanCard)}
          </details>
        )}

        <div
          role="log"
          aria-live="polite"
          aria-label={`Messages with ${peer.name}`}
          className="message-list"
        >
          {messages.map((message) => (
            // Represent one sent or received message, including its timestamp and read state.
            <article
              className={`message ${message.from === me ? "sent" : "received"}`}
              key={message.id}
            >
              <p>{message.text}</p>
              <span>
                {timeLabel(message.at)}
                {message.from === me
                  ? message.read
                    ? " · Read"
                    : " · Sent"
                  : ""}
              </span>
            </article>
          ))}

          {!messages.length && (
            <p className="muted">Say hello to {peer.name}.</p>
          )}
          <div ref={bottom} />
        </div>
      </main>

      <form
        ref={form}
        className="message-composer"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await perform({
            type: "send-message",
            to: peer.id,
            text: draft,
            ...(related[0] ? { loanId: related[0].id } : {}),
          });
          // Keep the message draft and show the error when sending fails.
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setDraft("");
          setError("");
        }}
      >
        <ErrorText text={error} />
        <div>
          <label className="sr-only" htmlFor="message-text">
            Message {peer.name}
          </label>
          <textarea
            id="message-text"
            value={draft}
            maxLength={2000}
            placeholder="Type a message…"
            rows={1}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Send on Enter only; preserve Shift+Enter and input-method composition.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                form.current?.requestSubmit();
              }
            }}
          />
          <button
            className="button primary"
            type="submit"
            aria-label="Send message"
            disabled={saving || !draft.trim()}
          >
            <Glyph name="send" />
          </button>
        </div>
      </form>
      {editing && (
        <LoanForm
          item={store.items.find((i) => i.id === editing.itemId)!}
          loan={editing}
          onClose={() => setEditing(null)}
          onDone={() => setEditing(null)}
        />
      )}
    </>
  );
}
