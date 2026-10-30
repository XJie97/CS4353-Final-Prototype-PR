import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { configured, db, supabase } from "./lib/supabase";
import { check, uploadImage, useData } from "./lib/data";
import {
  COMPLIMENTS,
  fileExtension,
  friendlyError,
  MILESTONES,
  nextMilestone,
  today,
  type Item,
  type Loan,
} from "./lib/model";
import { Empty, FileField, Modal, Pill, StorageImage } from "./components";

type Page = "shelf" | "items" | "loans" | "friends" | "chats" | "profile";
type Dialog =
  | { kind: "auth"; mode: "signin" | "signup" }
  | { kind: "item" }
  | { kind: "location"; item: Item }
  | { kind: "loan"; item: Item }
  | { kind: "proof" | "review"; loan: Loan }
  | { kind: "photo"; item: Item }
  | { kind: "avatar" }
  | null;
const nav: { id: Page; label: string }[] = [
  { id: "shelf", label: "Community items" },
  { id: "items", label: "My items" },
  { id: "loans", label: "My loans" },
  { id: "friends", label: "Friends" },
  { id: "chats", label: "Chats" },
  { id: "profile", label: "Profile" },
];
const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const date = (value: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(configured);
  const [connection, setConnection] = useState<"checking" | "ready" | "error">(
    configured ? "checking" : "error",
  );
  const [page, setPage] = useState<Page>("shelf");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [loanFilter, setLoanFilter] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>([]);
  const user = session?.user;
  const data = useData(user?.id);
  const me = data.profiles.find((p) => p.id === user?.id);
  const nameOf = (id: string) => {
    const p = data.profiles.find((person) => person.id === id);
    return p?.display_name || p?.username || "A member of your circle";
  };
  const spriteOf = (id?: string) => data.sprites.find((s) => s.id === id);
  const ownItems = data.items.filter((i) => i.owner_id === user?.id);
  const acceptedIds = useMemo(
    () => [
      ...new Set(
        data.friends
          .filter((f) => f.status === "accepted")
          .map((f) =>
            f.requester_id === user?.id ? f.recipient_id : f.requester_id,
          ),
      ),
    ],
    [data.friends, user?.id],
  );
  const pending = data.friends.filter(
    (f) => f.status === "pending" && f.recipient_id === user?.id,
  );

  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .then(({ error }) => {
        if (active)
          setConnection(!error || error.code === "42501" ? "ready" : "error");
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  function open(next: Dialog) {
    if (busy) return;
    setFile(null);
    setNotice(null);
    setDialog(next);
    if (next?.kind === "review")
      setSelectedCompliments(next.loan.review_compliments);
  }
  function close() {
    if (!busy) setDialog(null);
  }
  async function perform(
    job: () => Promise<unknown>,
    success: string,
    dismiss = true,
    refresh = true,
  ) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      await job();
      if (refresh) await data.reload();
      if (dismiss) setDialog(null);
      setNotice({ text: success });
    } catch (error) {
      setNotice({ text: friendlyError(error), error: true });
      if (refresh) await data.reload();
    } finally {
      setBusy(false);
    }
  }
  function form(
    job: (fd: FormData) => Promise<unknown>,
    success: string,
    dismiss = true,
    refresh = true,
  ) {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      void perform(() => job(fd), success, dismiss);
    };
  }
  const newItem = () =>
    open(user ? { kind: "item" } : { kind: "auth", mode: "signup" });

  async function itemPhoto(item: Item, photo: File) {
    const path = `${user!.id}/${item.id}/${crypto.randomUUID()}.${fileExtension(photo)}`;
    await uploadImage("item-images", path, photo);
    try {
      check(
        await db()
          .from("item_images")
          .insert({
            item_id: item.id,
            storage_path: path,
            sort_order: data.images.filter((i) => i.item_id === item.id).length,
          }),
      );
    } catch (error) {
      await db().storage.from("item-images").remove([path]);
      throw error;
    }
  }

  const visibleItems = data.items.filter(
    (i) =>
      (page !== "items" || i.owner_id === user?.id) &&
      (!availableOnly || i.status === "available") &&
      `${i.name} ${i.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredLoans = data.loans.filter(
    (l) => loanFilter === "all" || l.temporal_status === loanFilter,
  );

  function itemCard(item: Item) {
    const mine = item.owner_id === user?.id;
    const images = data.images
      .filter((image) => image.item_id === item.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const locations = data.locations.filter((l) => l.item_id === item.id);
    return (
      <article className="item-card" key={item.id}>
        <p>Status: {item.status === "available" ? "Available" : "On loan"}</p>
        {images.map((image, index) => (
          <StorageImage
            key={image.id}
            bucket="item-images"
            path={image.storage_path}
            alt={`${item.name} photo ${index + 1}`}
          />
        ))}
        <div className="item-content">
          <h3>{item.name}</h3>
          <p>Owner: {mine ? "You" : nameOf(item.owner_id)}</p>
          <p className="clamp">{item.description || "No description."}</p>
          <div className="location-line">
            {locations.length
              ? locations.map((l) => l.name).join(" · ")
              : "No locations added"}
          </div>
          {item.compliments.length > 0 && (
            <div className="tags">
              {[...new Set(item.compliments)].map((c) => (
                <Pill key={c}>{c}</Pill>
              ))}
            </div>
          )}
          <div className="card-actions">
            {mine ? (
              <>
                <button onClick={() => open({ kind: "loan", item })}>
                  Create loan
                </button>
                <button
                  className="icon-button"
                  title="Add a location"
                  aria-label={`Add location for ${item.name}`}
                  onClick={() => open({ kind: "location", item })}
                >
                  Add location
                </button>
                <button
                  className="icon-button"
                  title="Add photo"
                  aria-label={`Add photo for ${item.name}`}
                  onClick={() => open({ kind: "photo", item })}
                >
                  Add photo
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setPage("chats");
                  void perform(async () => {
                    check(
                      await db().from("chats").insert({
                        user_one_id: user!.id,
                        user_two_id: item.owner_id,
                      }),
                    );
                  }, "Chat created. Messaging is not implemented yet.");
                }}
              >
                Start a chat
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const submitButton = (label: string) => (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <>Saving…</> : label}
    </button>
  );
  const feedback = notice && (
    <div
      role={notice.error ? "alert" : "status"}
      className={`notice ${notice.error ? "error" : ""}`}
    >
      {notice.text}
    </div>
  );

  return (
    <div className="app-shell">
      <header>
        <h1>CS4353 prototype</h1>
        <div className="account-controls">
          <span>
            {connection === "ready"
              ? "Database connected"
              : connection === "checking"
                ? "Connecting…"
                : "Connection needs attention"}
          </span>
          {user ? (
            <>
              <span>{me?.display_name || user.email}</span>
              <button
                onClick={() => void data.reload()}
                disabled={data.loading}
              >
                Refresh data
              </button>
            </>
          ) : (
            <>
              <button onClick={() => open({ kind: "auth", mode: "signin" })}>
                Sign in
              </button>
              <button onClick={() => open({ kind: "auth", mode: "signup" })}>
                Create account
              </button>
            </>
          )}
        </div>
      </header>
      <nav aria-label="Main navigation">
        {nav.map(({ id, label }) => (
          <button
            key={id}
            aria-current={page === id ? "page" : undefined}
            onClick={() => {
              setPage(id);
              setQuery("");
            }}
          >
            {label}
            {id === "friends" && pending.length > 0
              ? ` (${pending.length})`
              : ""}
          </button>
        ))}
      </nav>
      <main>
        {!dialog && feedback}
        {!configured && (
          <div role="alert" className="notice error">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env,
            then restart the app.
          </div>
        )}
        {data.error && (
          <div role="alert" className="notice error">
            Could not load your shelf: {data.error}{" "}
            <button onClick={() => void data.reload()}>Try again</button>
          </div>
        )}

        {(page === "shelf" || page === "items") && (
          <>
            <div className="section-heading">
              <div>
                <h2>
                  {page === "items" ? "My items" : "Community items"}{" "}
                  <span className="count">{visibleItems.length}</span>
                </h2>
              </div>
              <button className="text-button" onClick={newItem}>
                Add an item
              </button>
            </div>
            <div className="filter-bar">
              <div className="segmented">
                <button
                  className={!availableOnly ? "selected" : ""}
                  onClick={() => setAvailableOnly(false)}
                >
                  All items
                </button>
                <button
                  className={availableOnly ? "selected" : ""}
                  onClick={() => setAvailableOnly(true)}
                >
                  Available now
                </button>
              </div>
              <label className="search">
                <input
                  aria-label="Search items"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find something to borrow…"
                />
              </label>
            </div>
            {authLoading || data.loading ? (
              <div className="loading">Loading your shelf…</div>
            ) : !user ? (
              <Empty
                title="Sign in required"
                text="Sign in to see your own items and the things your friends are sharing."
                action={
                  <button
                    className="button secondary"
                    onClick={() => open({ kind: "auth", mode: "signin" })}
                  >
                    Sign in to explore
                  </button>
                }
              />
            ) : visibleItems.length ? (
              <div className="item-grid">{visibleItems.map(itemCard)}</div>
            ) : (
              <Empty
                title={
                  query || availableOnly ? "No matching items" : "No items yet"
                }
                text={
                  query || availableOnly
                    ? "Try another search or switch to all items."
                    : "Add your first item, then invite a friend into your circle."
                }
                action={
                  <button className="button secondary" onClick={newItem}>
                    Add your first item
                  </button>
                }
              />
            )}
          </>
        )}

        {page !== "shelf" && page !== "items" && (
          <>
            <h2>{nav.find((n) => n.id === page)?.label}</h2>
            {!user ? (
              <Empty
                title="Sign in required"
                text="Sign in or create an account to get started."
                action={
                  <button
                    className="button primary"
                    onClick={() => open({ kind: "auth", mode: "signin" })}
                  >
                    Sign in
                  </button>
                }
              />
            ) : data.loading ? (
              <div className="loading">Loading…</div>
            ) : (
              <>
                {page === "loans" && (
                  <>
                    <div className="filter-bar">
                      <div className="segmented">
                        {["all", "current", "upcoming", "past"].map((s) => (
                          <button
                            key={s}
                            className={loanFilter === s ? "selected" : ""}
                            onClick={() => setLoanFilter(s)}
                          >
                            {s === "all"
                              ? "All loans"
                              : s[0].toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                      <small>Dates include both start and end days.</small>
                    </div>
                    {filteredLoans.length ? (
                      <div className="loan-list">
                        {filteredLoans.map((loan) => {
                          const item = data.items.find(
                            (i) => i.id === loan.item_id,
                          );
                          const mine = item?.owner_id === user.id;
                          const next = nextMilestone(loan);
                          const canVerify =
                            next &&
                            (next.actor === "owner"
                              ? mine
                              : loan.borrower_id === user.id);
                          return (
                            <article className="panel loan-card" key={loan.id}>
                              <div className="loan-title">
                                <div className="loan-item">
                                  <div>
                                    <h3>
                                      {item?.name ||
                                        "Item from a previous connection"}
                                    </h3>
                                    <small>
                                      {mine
                                        ? `Lending to ${nameOf(loan.borrower_id)}`
                                        : item
                                          ? `Borrowing from ${nameOf(item.owner_id)}`
                                          : "Your borrowed loan"}
                                    </small>
                                  </div>
                                </div>
                                <div className="tags">
                                  <Pill
                                    tone={
                                      loan.temporal_status === "past"
                                        ? ""
                                        : "green"
                                    }
                                  >
                                    {loan.temporal_status}
                                  </Pill>
                                  <Pill>
                                    {loan.specific_status.replace("_", "-")}
                                  </Pill>
                                </div>
                              </div>
                              <div className="loan-dates">
                                {date(loan.starts_on)} to {date(loan.due_on)}
                              </div>
                              <div className="milestones">
                                {MILESTONES.map((step) => (
                                  <div
                                    key={step.key}
                                    className={`milestone ${loan[step.field] ? "complete" : ""}`}
                                  >
                                    <span>
                                      {loan[step.field]
                                        ? "Done: "
                                        : "Pending: "}
                                    </span>
                                    <small>{step.label}</small>
                                    {loan[step.image] && (
                                      <StorageImage
                                        bucket="loan-verification"
                                        path={loan[step.image]}
                                        alt={step.label}
                                        className="proof-thumbnail"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div className="loan-footer">
                                <span>
                                  {next
                                    ? canVerify
                                      ? `Your next step: ${next.label.toLowerCase()}.`
                                      : `Waiting for ${next.actor === "owner" ? "owner" : "borrower"} ${next.label.split(" ")[1]}.`
                                    : "Completed and verified by the owner."}
                                </span>
                                {canVerify && (
                                  <button
                                    className="button secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      open({ kind: "proof", loan })
                                    }
                                  >
                                    Upload verification{" "}
                                  </button>
                                )}
                                {loan.returned_at &&
                                  loan.borrower_id === user.id && (
                                    <button
                                      className="button secondary"
                                      onClick={() =>
                                        open({ kind: "review", loan })
                                      }
                                    >
                                      {loan.review_text
                                        ? "Edit review"
                                        : "Leave a review"}{" "}
                                    </button>
                                  )}
                              </div>
                              {loan.review_text && (
                                <div className="review">
                                  <div>
                                    <p>{loan.review_text}</p>
                                    <small>
                                      {loan.review_compliments.join(" · ") ||
                                        "No compliments selected"}
                                    </small>
                                    {loan.review_image_path && (
                                      <StorageImage
                                        bucket="loan-review-images"
                                        path={loan.review_image_path}
                                        alt="Loan review"
                                        className="review-photo"
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <Empty
                        title="No loans"
                        text="Create a loan from one of your items after a friend accepts your request."
                        action={
                          <button
                            className="button secondary"
                            onClick={() => setPage("items")}
                          >
                            Go to my items
                          </button>
                        }
                      />
                    )}
                  </>
                )}

                {page === "friends" && (
                  <>
                    {pending.length > 0 && (
                      <section className="panel">
                        <h3>
                          Friend requests <Pill>{pending.length}</Pill>
                        </h3>
                        {pending.map((f) => (
                          <div className="person-row" key={f.id}>
                            <div>
                              <strong>{nameOf(f.requester_id)}</strong>
                              <small>Would like to join your circle</small>
                            </div>
                            <button
                              className="button primary"
                              disabled={busy}
                              onClick={() =>
                                void perform(async () => {
                                  check(
                                    await db()
                                      .from("friendships")
                                      .update({ status: "accepted" })
                                      .eq("id", f.id),
                                  );
                                }, "Friend request accepted.")
                              }
                            >
                              Accept
                            </button>
                            <button
                              className="icon-button"
                              disabled={busy}
                              aria-label={`Decline request from ${nameOf(f.requester_id)}`}
                              onClick={() =>
                                void perform(async () => {
                                  check(
                                    await db()
                                      .from("friendships")
                                      .delete()
                                      .eq("id", f.id),
                                  );
                                }, "Friend request declined.")
                              }
                            >
                              Decline
                            </button>
                          </div>
                        ))}
                      </section>
                    )}
                    <div className="section-heading">
                      <h2>Find your people</h2>
                      <Pill>{acceptedIds.length} friends</Pill>
                    </div>
                    <label className="search standalone">
                      <input
                        aria-label="Find a friend"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or username…"
                      />
                    </label>
                    <div className="people-grid">
                      {data.profiles
                        .filter(
                          (p) =>
                            p.id !== user.id &&
                            `${p.display_name} ${p.username || ""}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                        )
                        .map((p) => {
                          const friends = acceptedIds.includes(p.id);
                          const sent = data.friends.some(
                            (f) =>
                              f.requester_id === user.id &&
                              f.recipient_id === p.id &&
                              f.status === "pending",
                          );
                          return (
                            <article className="panel person-card" key={p.id}>
                              <h3>
                                {p.display_name ||
                                  p.username ||
                                  "New neighbour"}
                              </h3>
                              <small>
                                {p.username
                                  ? `@${p.username}`
                                  : "No username yet"}
                              </small>
                              <button
                                className={`button ${friends ? "secondary" : "primary"}`}
                                disabled={busy || sent}
                                onClick={() =>
                                  friends
                                    ? (setPage("chats"),
                                      void perform(async () => {
                                        check(
                                          await db().from("chats").insert({
                                            user_one_id: user.id,
                                            user_two_id: p.id,
                                          }),
                                        );
                                      }, "New chat created."))
                                    : void perform(async () => {
                                        check(
                                          await db()
                                            .from("friendships")
                                            .insert({
                                              requester_id: user.id,
                                              recipient_id: p.id,
                                            }),
                                        );
                                      }, "Friend request sent.")
                                }
                              >
                                {friends ? (
                                  <>Start a chat</>
                                ) : sent ? (
                                  "Request sent"
                                ) : (
                                  <>Add friend</>
                                )}
                              </button>
                              {friends && (
                                <Pill tone="green">In your circle</Pill>
                              )}
                            </article>
                          );
                        })}
                    </div>
                    {data.profiles.filter((p) => p.id !== user.id).length ===
                      0 && (
                      <Empty
                        title="No other users yet"
                        text="Ask a groupmate to create an account. They will appear here so you can connect."
                      />
                    )}
                    {data.friends.some(
                      (f) =>
                        f.requester_id === user.id && f.status === "pending",
                    ) && (
                      <section className="panel">
                        <h3>Sent requests</h3>
                        {data.friends
                          .filter(
                            (f) =>
                              f.requester_id === user.id &&
                              f.status === "pending",
                          )
                          .map((f) => (
                            <div className="person-row" key={f.id}>
                              <strong>{nameOf(f.recipient_id)}</strong>
                              <Pill>Pending</Pill>
                              <button
                                className="text-button"
                                disabled={busy}
                                onClick={() =>
                                  void perform(async () => {
                                    check(
                                      await db()
                                        .from("friendships")
                                        .delete()
                                        .eq("id", f.id),
                                    );
                                  }, "Request cancelled.")
                                }
                              >
                                Cancel request
                              </button>
                            </div>
                          ))}
                      </section>
                    )}
                  </>
                )}

                {page === "chats" && (
                  <>
                    {data.chats.length ? (
                      <div className="panel chat-list">
                        {data.chats.map((c) => {
                          const other =
                            c.user_one_id === user.id
                              ? c.user_two_id
                              : c.user_one_id;
                          return (
                            <div className="person-row" key={c.id}>
                              <div>
                                <strong>{nameOf(other)}</strong>
                                <small>
                                  Two-person chat · Created{" "}
                                  {date(c.created_at.slice(0, 10))}
                                </small>
                              </div>
                              <Pill>Chat space ready</Pill>
                            </div>
                          );
                        })}
                        <div className="subtle-note">
                          These are real chat records. Sending messages will be
                          added in a later iteration.
                        </div>
                      </div>
                    ) : (
                      <Empty
                        title="No chats"
                        text="Create a two-person chat from your circle. Each new chat is stored separately."
                        action={
                          <button
                            className="button secondary"
                            onClick={() => setPage("friends")}
                          >
                            Find a friend
                          </button>
                        }
                      />
                    )}
                  </>
                )}

                {page === "profile" && (
                  <div className="profile-grid">
                    <section className="panel profile-card">
                      {me?.avatar_path && (
                        <StorageImage
                          bucket="profile-images"
                          path={me.avatar_path}
                          alt="Profile image"
                        />
                      )}
                      <h2>{me?.display_name || "Profile"}</h2>
                      <p>{user.email}</p>
                      <button
                        className="button secondary"
                        onClick={() => open({ kind: "avatar" })}
                      >
                        Change profile photo
                      </button>
                      <form
                        className="stack"
                        onSubmit={form(async (fd) => {
                          check(
                            await db()
                              .from("profiles")
                              .update({
                                display_name: text(fd, "name"),
                                username: text(fd, "username") || null,
                              })
                              .eq("id", user.id),
                          );
                        }, "Profile updated.")}
                      >
                        <label>
                          Display name
                          <input
                            name="name"
                            required
                            maxLength={100}
                            defaultValue={me?.display_name}
                          />
                        </label>
                        <label>
                          Username
                          <input
                            name="username"
                            pattern="[a-z0-9_]{3,30}"
                            placeholder="lowercase_name"
                            defaultValue={me?.username || ""}
                          />
                          <small>
                            3–30 lowercase letters, numbers, or underscores.
                          </small>
                        </label>
                        {submitButton("Save profile")}
                      </form>
                      <button
                        className="text-button signout"
                        disabled={busy}
                        onClick={() =>
                          void perform(
                            async () => {
                              check(await db().auth.signOut());
                              setPage("shelf");
                            },
                            "Signed out.",
                            true,
                            false,
                          )
                        }
                      >
                        Sign out
                      </button>
                    </section>
                    <section className="panel">
                      <div className="section-heading">
                        <h2>Your sprite</h2>
                      </div>
                      {me && (
                        <SpriteForm
                          key={me.sprite_id}
                          sprite={spriteOf(me.sprite_id)}
                          disabled={busy}
                          submit={(job) => void perform(job, "Sprite updated.")}
                        />
                      )}
                      <div className="subtle-note">
                        Head and torso are placeholder asset IDs for your
                        group's artwork.
                      </div>
                      <h3 className="space-top">Compliments on your shelf</h3>
                      <div className="tags">
                        {COMPLIMENTS.map((c) => (
                          <Pill key={c}>
                            {c} ·{" "}
                            {ownItems.reduce(
                              (sum, item) =>
                                sum +
                                item.compliments.filter((x) => x === c).length,
                              0,
                            )}
                          </Pill>
                        ))}
                      </div>
                      <h3 className="space-top">Your item sprites</h3>
                      {ownItems.map((item) => (
                        <details key={item.id}>
                          <summary>{item.name}</summary>
                          <SpriteForm
                            sprite={spriteOf(item.sprite_id)}
                            disabled={busy}
                            submit={(job) =>
                              void perform(job, "Item sprite updated.")
                            }
                          />
                        </details>
                      ))}
                    </section>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {dialog && (
        <Modal
          title={
            dialog.kind === "auth"
              ? dialog.mode === "signup"
                ? "Create account"
                : "Sign in"
              : dialog.kind === "item"
                ? "Add item"
                : dialog.kind === "loan"
                  ? `Lend ${dialog.item.name}`
                  : dialog.kind === "location"
                    ? "Add an item location"
                    : dialog.kind === "proof"
                      ? "Verify the next handover"
                      : dialog.kind === "review"
                        ? "Loan review"
                        : dialog.kind === "avatar"
                          ? "Your profile photo"
                          : "Add an item photo"
          }
          close={close}
        >
          {feedback}
          {dialog.kind === "auth" && (
            <>
              <p className="muted">
                {dialog.mode === "signup"
                  ? "Create an account to add items and connect with your groupmates."
                  : "Sign in to pick up where you left off."}
              </p>
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  const fd = new FormData(event.currentTarget);
                  const mode = dialog.mode;
                  void perform(
                    async () => {
                      if (mode === "signup") {
                        const result = check(
                          await db().auth.signUp({
                            email: text(fd, "email"),
                            password: String(fd.get("password")),
                            options: {
                              data: { display_name: text(fd, "name") },
                              emailRedirectTo: window.location.origin,
                            },
                          }),
                        );
                        if (!result.session) {
                          setDialog({ kind: "auth", mode: "signin" });
                          setNotice({
                            text: "Check your email to confirm your account, then sign in here.",
                          });
                        } else setDialog(null);
                      } else
                        check(
                          await db().auth.signInWithPassword({
                            email: text(fd, "email"),
                            password: String(fd.get("password")),
                          }),
                        );
                    },
                    mode === "signup"
                      ? "Account created. If confirmation is enabled, check your email before signing in."
                      : "Signed in.",
                    mode !== "signup",
                    false,
                  );
                }}
              >
                {dialog.mode === "signup" && (
                  <label>
                    Your name
                    <input
                      name="name"
                      autoComplete="name"
                      placeholder="How should we call you?"
                      required
                      maxLength={100}
                    />
                  </label>
                )}
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={
                      dialog.mode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    placeholder="At least 6 characters"
                  />
                </label>
                {submitButton(
                  dialog.mode === "signup" ? "Create account" : "Sign in",
                )}
              </form>
              <div className="auth-switch">
                {dialog.mode === "signup"
                  ? "Already part of the circle?"
                  : "New around here?"}{" "}
                <button
                  disabled={busy}
                  className="text-button"
                  onClick={() =>
                    open({
                      kind: "auth",
                      mode: dialog.mode === "signup" ? "signin" : "signup",
                    })
                  }
                >
                  {dialog.mode === "signup" ? "Sign in" : "Create an account"}
                </button>
              </div>
            </>
          )}

          {dialog.kind === "item" && (
            <form
              className="stack"
              onSubmit={form(async (fd) => {
                if (!text(fd, "name"))
                  throw new Error("Give your item a name.");
                if (file) fileExtension(file);
                const item = check(
                  await db()
                    .from("items")
                    .insert({
                      name: text(fd, "name"),
                      description: text(fd, "description"),
                    })
                    .select("*")
                    .single(),
                ) as Item;
                if (file) {
                  try {
                    await itemPhoto(item, file);
                  } catch (e) {
                    throw new Error(
                      `Item saved, but the photo could not be attached: ${friendlyError(e)}. Add its photo from your shelf.`,
                    );
                  }
                }
              }, "Item added to your shelf.")}
            >
              <p className="muted">
                Something useful, something loved, something a friend could
                borrow.
              </p>
              <label>
                Item name
                <input
                  name="name"
                  placeholder="e.g. A trusty instant camera"
                  required
                  maxLength={200}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  placeholder="What should your friends know?"
                  maxLength={5000}
                  rows={3}
                />
              </label>
              <FileField label="Item photo (optional)" onChange={setFile} />
              <small>
                Your item gets its own placeholder sprite. Add locations and
                loans from your shelf.
              </small>
              {submitButton("Add to my shelf")}
            </form>
          )}

          {dialog.kind === "location" && (
            <form
              className="stack"
              onSubmit={form(async (fd) => {
                check(
                  await db()
                    .from("item_locations")
                    .insert({
                      item_id: dialog.item.id,
                      name: text(fd, "name"),
                      latitude: Number(fd.get("latitude")),
                      longitude: Number(fd.get("longitude")),
                    }),
                );
              }, "Location added to this item.")}
            >
              <p className="muted">
                Locations are shared with your accepted friends.
              </p>
              <label>
                Location name
                <input
                  name="name"
                  placeholder="e.g. Campus locker"
                  required
                  maxLength={200}
                />
              </label>
              <div className="field-row">
                <label>
                  Latitude
                  <input
                    name="latitude"
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    placeholder="1.2966"
                    required
                  />
                </label>
                <label>
                  Longitude
                  <input
                    name="longitude"
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    placeholder="103.7764"
                    required
                  />
                </label>
              </div>
              {submitButton("Add location")}
            </form>
          )}

          {dialog.kind === "loan" && (
            <form
              className="stack"
              onSubmit={form(async (fd) => {
                if (text(fd, "end") < text(fd, "start"))
                  throw new Error(
                    "The end date must be on or after the start date.",
                  );
                const result = check(
                  await db().rpc("start_loan", {
                    target_item: dialog.item.id,
                    borrower: text(fd, "borrower"),
                    start_date: text(fd, "start"),
                    due_date: text(fd, "end"),
                  }),
                ) as Loan | Loan[];
                const loan = Array.isArray(result) ? result[0] : result;
                if (!loan?.id)
                  throw new Error(
                    "The loan response was incomplete. Refresh to check whether it was created.",
                  );
                check(
                  await db()
                    .from("loans")
                    .update({ sprite_colour: text(fd, "colour") })
                    .eq("id", loan.id),
                );
                setPage("loans");
              }, "Loan created. Upload the owner dropoff photo to begin the handover.")}
            >
              <label>
                Borrower
                <select name="borrower" required defaultValue="">
                  <option value="" disabled>
                    Choose an accepted friend
                  </option>
                  {acceptedIds.map((id) => (
                    <option key={id} value={id}>
                      {nameOf(id)}
                    </option>
                  ))}
                </select>
              </label>
              {!acceptedIds.length && (
                <div className="notice">
                  Add a friend and have them accept your request first.
                </div>
              )}
              <div className="field-row">
                <label>
                  Start date
                  <input
                    name="start"
                    type="date"
                    required
                    defaultValue={today()}
                  />
                </label>
                <label>
                  End date
                  <input
                    name="end"
                    type="date"
                    required
                    defaultValue={today()}
                  />
                </label>
              </div>
              <label>
                Loan sprite colour
                <input
                  name="colour"
                  type="text"
                  required
                  pattern="#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})"
                  defaultValue="#A2AD91"
                />
              </label>
              <small>
                Both dates are included. Overlapping bookings are blocked by the
                database.
              </small>
              {submitButton("Create loan")}
            </form>
          )}

          {dialog.kind === "proof" && (
            <form
              className="stack"
              onSubmit={form(async () => {
                const step = nextMilestone(dialog.loan);
                if (!step || !file)
                  throw new Error(
                    "Choose a verification image for the next step.",
                  );
                const path = `${dialog.loan.id}/${step.key}/${crypto.randomUUID()}.${fileExtension(file)}`;
                await uploadImage("loan-verification", path, file);
              }, "Photo uploaded and handover step verified.")}
            >
              <p className="muted">
                <strong>{nextMilestone(dialog.loan)?.label}</strong> · The image
                automatically marks this step. Verification photos cannot be
                replaced or deleted.
              </p>
              <FileField
                label="Verification photo"
                required
                onChange={setFile}
              />
              {submitButton("Upload and verify")}
            </form>
          )}

          {dialog.kind === "review" && (
            <form
              className="stack"
              onSubmit={form(async (fd) => {
                let path = dialog.loan.review_image_path;
                if (file)
                  path = await uploadImage(
                    "loan-review-images",
                    `${dialog.loan.id}/${crypto.randomUUID()}.${fileExtension(file)}`,
                    file,
                  );
                check(
                  await db().rpc("submit_loan_review", {
                    target_loan: dialog.loan.id,
                    body: text(fd, "review"),
                    compliments: selectedCompliments,
                    image_path: path,
                  }),
                );
              }, "Review saved. Your compliments now appear on the owner’s shelf.")}
            >
              <label>
                Your review
                <textarea
                  name="review"
                  rows={4}
                  required
                  maxLength={5000}
                  defaultValue={dialog.loan.review_text || ""}
                  placeholder="How was borrowing this item?"
                />
              </label>
              <fieldset>
                <legend>Leave a compliment</legend>
                <div className="compliment-options">
                  {COMPLIMENTS.map((c) => (
                    <label key={c}>
                      <input
                        type="checkbox"
                        checked={selectedCompliments.includes(c)}
                        onChange={(e) =>
                          setSelectedCompliments((v) =>
                            e.target.checked
                              ? [...v, c]
                              : v.filter((x) => x !== c),
                          )
                        }
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </fieldset>
              <FileField
                label={
                  dialog.loan.review_image_path
                    ? "Replace review photo (optional)"
                    : "Review photo (optional)"
                }
                onChange={setFile}
              />
              {submitButton("Save review")}
            </form>
          )}

          {(dialog.kind === "photo" || dialog.kind === "avatar") && (
            <form
              className="stack"
              onSubmit={form(async () => {
                if (!file) throw new Error("Choose an image.");
                if (dialog.kind === "photo") await itemPhoto(dialog.item, file);
                else {
                  const path = `${user!.id}/${crypto.randomUUID()}.${fileExtension(file)}`;
                  await uploadImage("profile-images", path, file);
                  try {
                    check(
                      await db()
                        .from("profiles")
                        .update({ avatar_path: path })
                        .eq("id", user!.id),
                    );
                  } catch (e) {
                    await db().storage.from("profile-images").remove([path]);
                    throw e;
                  }
                }
              }, "Photo saved.")}
            >
              <FileField label="Choose a photo" required onChange={setFile} />
              {submitButton("Upload photo")}
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

function SpriteForm({
  sprite,
  disabled,
  submit,
}: {
  sprite?: import("./lib/model").Sprite;
  disabled: boolean;
  submit: (job: () => Promise<unknown>) => void;
}) {
  if (!sprite) return <p className="muted">Your sprite is loading.</p>;
  return (
    <form
      className="stack sprite-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        submit(async () => {
          check(
            await db()
              .from("sprites")
              .update({
                colour: text(fd, "colour"),
                ...(sprite.category === "user"
                  ? {
                      head_asset_id: text(fd, "head"),
                      torso_asset_id: text(fd, "torso"),
                      level: Number(fd.get("level")),
                    }
                  : {}),
              })
              .eq("id", sprite.id),
          );
        });
      }}
    >
      <div className="sprite-form-preview">
        <label>
          Colour
          <input
            name="colour"
            pattern="#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})"
            required
            type="text"
            defaultValue={sprite.colour}
          />
        </label>
      </div>
      {sprite.category === "user" && (
        <>
          <label>
            Head asset ID
            <input
              name="head"
              required
              maxLength={128}
              defaultValue={sprite.head_asset_id || ""}
            />
          </label>
          <label>
            Torso asset ID
            <input
              name="torso"
              required
              maxLength={128}
              defaultValue={sprite.torso_asset_id || ""}
            />
          </label>
          <label>
            Level
            <input
              name="level"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={sprite.level || 0}
            />
          </label>
        </>
      )}
      <button className="button secondary" disabled={disabled}>
        Save sprite
      </button>
    </form>
  );
}
