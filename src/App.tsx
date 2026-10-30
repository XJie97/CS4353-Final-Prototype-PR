import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Heart,
  Leaf,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
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
import {
  Empty,
  FileField,
  Modal,
  Pill,
  SpriteBadge,
  StorageImage,
} from "./components";

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
const nav: { id: Page; label: string; icon: typeof Box }[] = [
  { id: "shelf", label: "Community shelf", icon: BookOpen },
  { id: "items", label: "My items", icon: Box },
  { id: "loans", label: "My loans", icon: CalendarDays },
  { id: "friends", label: "My circle", icon: Users },
  { id: "chats", label: "Chats", icon: MessageCircle },
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
        <div
          className="item-art"
          style={
            {
              "--art-colour": spriteOf(item.sprite_id)?.colour || "#a2ad91",
            } as React.CSSProperties
          }
        >
          {images[0] ? (
            <StorageImage
              bucket="item-images"
              path={images[0].storage_path}
              alt={item.name}
            />
          ) : (
            <SpriteBadge sprite={spriteOf(item.sprite_id)} large />
          )}
          <Pill tone={item.status === "available" ? "green" : "orange"}>
            {item.status === "available" ? "Available" : "On loan"}
          </Pill>
        </div>
        <div className="item-content">
          <div className="eyebrow">
            {mine ? "YOUR SHELF" : nameOf(item.owner_id)}
          </div>
          <h3>{item.name}</h3>
          <p className="clamp">
            {item.description || "A little something to share."}
          </p>
          <div className="location-line">
            <MapPin size={14} />
            {locations.length
              ? locations.map((l) => l.name).join(" · ")
              : "No locations added"}
          </div>
          {item.compliments.length > 0 && (
            <div className="tags">
              {[...new Set(item.compliments)].map((c) => (
                <Pill key={c}>
                  <Heart size={11} />
                  {c}
                </Pill>
              ))}
            </div>
          )}
          <div className="card-actions">
            {mine ? (
              <>
                <button onClick={() => open({ kind: "loan", item })}>
                  Create loan <ArrowUpRight size={15} />
                </button>
                <button
                  className="icon-button"
                  title="Add a location"
                  aria-label={`Add location for ${item.name}`}
                  onClick={() => open({ kind: "location", item })}
                >
                  <MapPin size={16} />
                </button>
                <button
                  className="icon-button"
                  title="Add photo"
                  aria-label={`Add photo for ${item.name}`}
                  onClick={() => open({ kind: "photo", item })}
                >
                  <Plus size={16} />
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
                  }, "Chat created. Message content can be added in the next iteration.");
                }}
              >
                Start a chat <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  const submitButton = (label: string) => (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle size={16} className="spin" /> Saving…
        </>
      ) : (
        label
      )}
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
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("shelf")}>
          <div className="brand-mark">
            <Box size={25} strokeWidth={1.7} />
          </div>
          <span>
            share<span className="brand-light">shelf</span>
            <small>A LITTLE GOES AROUND</small>
          </span>
        </button>
        <div className="nav-caption">YOUR NEIGHBOURHOOD</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
              onClick={() => {
                setPage(id);
                setQuery("");
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "friends" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={22} />
          <strong>Good things go around.</strong>
          <p>
            Borrow what you need.
            <br />
            Share what you have.
          </p>
          <span>CS4353 · FINAL PROTOTYPE</span>
        </div>
        <div className="sidebar-bottom">
          {user ? (
            <button className="account" onClick={() => setPage("profile")}>
              <SpriteBadge sprite={spriteOf(me?.sprite_id)} />
              <span>
                <strong>{me?.display_name || "Your profile"}</strong>
                <small>View your profile</small>
              </span>
              <Settings2 size={16} />
            </button>
          ) : (
            <button
              className="button secondary full"
              onClick={() => open({ kind: "auth", mode: "signin" })}
            >
              Sign in to your circle <ArrowRight size={15} />
            </button>
          )}
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <div className="breadcrumb">
            Your space <ChevronRight size={13} />
            <strong>
              {nav.find((n) => n.id === page)?.label || "My profile"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${connection}`}>
              <i />
              {connection === "ready"
                ? "Supabase connected"
                : connection === "checking"
                  ? "Connecting…"
                  : "Connection needs attention"}
            </span>
            {user ? (
              <>
                <button
                  className="icon-button"
                  aria-label="My profile"
                  onClick={() => setPage("profile")}
                >
                  <Settings2 size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Refresh data"
                  title="Refresh data"
                  onClick={() => void data.reload()}
                  disabled={data.loading}
                >
                  <RefreshCw size={17} className={data.loading ? "spin" : ""} />
                </button>
              </>
            ) : (
              <button
                className="text-button"
                onClick={() => open({ kind: "auth", mode: "signin" })}
              >
                Sign in <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>
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
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span className="mini-dot" /> MADE FOR YOUR CIRCLE
                  </div>
                  <h1>
                    {user ? (
                      <>
                        A good day
                        <br />
                        to share,{" "}
                        <em>{(me?.display_name || "friend").split(" ")[0]}.</em>
                      </>
                    ) : (
                      <>
                        A little less buying.
                        <br />A little more <em>sharing.</em>
                      </>
                    )}
                  </h1>
                  <p>
                    The things you need might be closer than you think.
                    <br className="desktop-break" /> Borrow and lend with people
                    you know.
                  </p>
                  <button className="button primary" onClick={newItem}>
                    {user ? (
                      <>
                        <Plus size={17} /> Add to your shelf
                      </>
                    ) : (
                      <>
                        Create your account <ArrowUpRight size={17} />
                      </>
                    )}
                  </button>
                  <div className="hero-foot">
                    <ShieldCheck size={15} /> A shared shelf. A trusted circle.
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-card art-card-one">
                    <BookOpen />
                    <span>Borrow a good story</span>
                  </div>
                  <div className="art-card art-card-two">
                    <Box />
                    <span>Share something useful</span>
                  </div>
                  <div className="art-card art-card-three">
                    <Leaf />
                    <span>A little kindness</span>
                  </div>
                  <div className="orbit-icon">
                    <ArrowUpRight />
                  </div>
                  <Sparkles className="sparkle-one" />
                  <Sparkles className="sparkle-two" />
                  <span className="art-caption">YOURS. MINE. OURS.</span>
                </div>
              </section>
              <div className="stat-row">
                <div>
                  <Box size={19} />
                  <span>
                    <strong>{ownItems.length}</strong> items on your shelf
                  </span>
                </div>
                <div>
                  <Users size={19} />
                  <span>
                    <strong>{acceptedIds.length}</strong> friends in your circle
                  </span>
                </div>
                <div>
                  <ArrowDownLeft size={19} />
                  <span>
                    <strong>
                      {
                        data.loans.filter(
                          (l) =>
                            l.borrower_id === user?.id &&
                            l.temporal_status === "current",
                        ).length
                      }
                    </strong>{" "}
                    current borrowed loans
                  </span>
                </div>
              </div>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    {page === "items"
                      ? "A LITTLE OF WHAT YOU HAVE"
                      : "BETTER WHEN SHARED"}
                  </div>
                  <h2>
                    {page === "items"
                      ? "Your personal shelf"
                      : "The community shelf"}{" "}
                    <span className="count">{visibleItems.length}</span>
                  </h2>
                </div>
                <button className="text-button" onClick={newItem}>
                  Add an item <Plus size={16} />
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
                  <Search size={16} />
                  <input
                    aria-label="Search items"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find something to borrow…"
                  />
                </label>
              </div>
              {authLoading || data.loading ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  Loading your shelf…
                </div>
              ) : !user ? (
                <Empty
                  icon={<BookOpen />}
                  title="Your circle starts with you"
                  text="Sign in to see your own items and the things your friends are sharing."
                  action={
                    <button
                      className="button secondary"
                      onClick={() => open({ kind: "auth", mode: "signin" })}
                    >
                      Sign in to explore <ArrowRight size={16} />
                    </button>
                  }
                />
              ) : visibleItems.length ? (
                <div className="item-grid">{visibleItems.map(itemCard)}</div>
              ) : (
                <Empty
                  icon={<Box />}
                  title={
                    query || availableOnly
                      ? "Nothing here just yet"
                      : "Make room for sharing"
                  }
                  text={
                    query || availableOnly
                      ? "Try another search or switch to all items."
                      : "Add your first item, then invite a friend into your circle."
                  }
                  action={
                    <button className="button secondary" onClick={newItem}>
                      <Plus size={16} /> Add your first item
                    </button>
                  }
                />
              )}
            </>
          )}

          {page !== "shelf" && page !== "items" && (
            <>
              <div className="page-heading">
                <div className="eyebrow">YOUR SHARING SPACE</div>
                <h1>
                  {page === "loans"
                    ? "A little give and take."
                    : page === "friends"
                      ? "Good company, good sharing."
                      : page === "chats"
                        ? "Keep the circle talking."
                        : "Make yourself at home."}
                </h1>
                <p>
                  {page === "loans"
                    ? "Plan a loan, verify each handover, and keep things moving."
                    : page === "friends"
                      ? "Find your friends and see what you can share together."
                      : page === "chats"
                        ? "Your two-person chat spaces. Messaging is next on the roadmap."
                        : "Your profile, your sprite, and the little things you share."}
                </p>
              </div>
              {!user ? (
                <Empty
                  icon={<Users />}
                  title="A space for your circle"
                  text="Sign in or create an account to get started."
                  action={
                    <button
                      className="button primary"
                      onClick={() => open({ kind: "auth", mode: "signin" })}
                    >
                      Sign in <ArrowRight size={16} />
                    </button>
                  }
                />
              ) : data.loading ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  Loading…
                </div>
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
                              <article
                                className="panel loan-card"
                                key={loan.id}
                              >
                                <div className="loan-title">
                                  <div className="loan-item">
                                    <div
                                      className="small-colour"
                                      style={{ background: loan.sprite_colour }}
                                    />
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
                                  <CalendarDays size={16} />
                                  {date(loan.starts_on)}{" "}
                                  <ArrowRight size={13} /> {date(loan.due_on)}
                                </div>
                                <div className="milestones">
                                  {MILESTONES.map((step) => (
                                    <div
                                      key={step.key}
                                      className={`milestone ${loan[step.field] ? "complete" : ""}`}
                                    >
                                      <span>
                                        {loan[step.field] ? (
                                          <Check size={13} />
                                        ) : (
                                          <span className="step-dot" />
                                        )}
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
                                      <ArrowUpRight size={15} />
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
                                        <Heart size={15} />
                                      </button>
                                    )}
                                </div>
                                {loan.review_text && (
                                  <div className="review">
                                    <Heart size={15} />
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
                          icon={<CalendarDays />}
                          title="Nothing borrowed, nothing lent. Yet."
                          text="Create a loan from one of your items after a friend accepts your request."
                          action={
                            <button
                              className="button secondary"
                              onClick={() => setPage("items")}
                            >
                              Go to my items <ArrowRight size={16} />
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
                              <SpriteBadge
                                sprite={spriteOf(
                                  data.profiles.find(
                                    (p) => p.id === f.requester_id,
                                  )?.sprite_id,
                                )}
                              />
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
                                <X size={18} />
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
                        <Search size={16} />
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
                                <SpriteBadge sprite={spriteOf(p.sprite_id)} />
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
                                    <>
                                      <MessageCircle size={15} /> Start a chat
                                    </>
                                  ) : sent ? (
                                    "Request sent"
                                  ) : (
                                    <>
                                      <Plus size={15} /> Add friend
                                    </>
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
                          icon={<Users />}
                          title="Be the start of something good"
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
                                <SpriteBadge
                                  sprite={spriteOf(
                                    data.profiles.find((p) => p.id === other)
                                      ?.sprite_id,
                                  )}
                                />
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
                            <CircleHelp size={17} />
                            These are real chat records. Sending messages will
                            be added in a later iteration.
                          </div>
                        </div>
                      ) : (
                        <Empty
                          icon={<MessageCircle />}
                          title="A conversation starts with a friend"
                          text="Create a two-person chat from your circle. Each new chat is stored separately."
                          action={
                            <button
                              className="button secondary"
                              onClick={() => setPage("friends")}
                            >
                              Find a friend <ArrowRight size={16} />
                            </button>
                          }
                        />
                      )}
                    </>
                  )}

                  {page === "profile" && (
                    <div className="profile-grid">
                      <section className="panel profile-card">
                        <div className="profile-avatar">
                          {me?.avatar_path ? (
                            <StorageImage
                              bucket="profile-images"
                              path={me.avatar_path}
                              alt="Your profile image"
                            />
                          ) : (
                            <SpriteBadge
                              sprite={spriteOf(me?.sprite_id)}
                              large
                            />
                          )}
                        </div>
                        <h2>{me?.display_name || "Make it yours"}</h2>
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
                          <LogOut size={15} /> Sign out
                        </button>
                      </section>
                      <section className="panel">
                        <div className="section-heading">
                          <h2>Your sprite</h2>
                          <Sparkles size={19} />
                        </div>
                        {me && (
                          <SpriteForm
                            key={me.sprite_id}
                            sprite={spriteOf(me.sprite_id)}
                            disabled={busy}
                            submit={(job) =>
                              void perform(job, "Sprite updated.")
                            }
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
                              <Heart size={12} />
                              {c} ·{" "}
                              {ownItems.reduce(
                                (sum, item) =>
                                  sum +
                                  item.compliments.filter((x) => x === c)
                                    .length,
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
          <footer className="footer">
            <span>
              <Box size={14} /> A little goes around.
            </span>
            <span>Share Shelf · CS4353 prototype</span>
          </footer>
        </main>
      </div>

      {dialog && (
        <Modal
          title={
            dialog.kind === "auth"
              ? dialog.mode === "signup"
                ? "Start your sharing circle"
                : "Welcome back"
              : dialog.kind === "item"
                ? "Add something to share"
                : dialog.kind === "loan"
                  ? `Lend ${dialog.item.name}`
                  : dialog.kind === "location"
                    ? "Add an item location"
                    : dialog.kind === "proof"
                      ? "Verify the next handover"
                      : dialog.kind === "review"
                        ? "A little appreciation"
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
                      : "Welcome back.",
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
                <input name="colour" type="color" defaultValue="#A2AD91" />
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
        <SpriteBadge sprite={sprite} large />
        <label>
          Colour
          <input
            name="colour"
            type="color"
            defaultValue={
              sprite.colour.length === 4
                ? "#" + [...sprite.colour.slice(1)].map((c) => c + c).join("")
                : sprite.colour.slice(0, 7)
            }
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
