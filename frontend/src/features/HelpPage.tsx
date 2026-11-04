import { helpOutcome, visibleHelpRequests } from "../app/help-view";
import { useState } from "react";
import { useApp, uid } from "../app/context";
import { LOCKERS, todayLocal } from "../app/domain";
import { ErrorText, Modal } from "../components/ui/shared";
export function HelpPage({
  onClose,
  onLoan,
}: {
  onClose: () => void;
  onLoan: (id: string) => void;
}) {
  const { store, perform } = useApp();
  const [history, setHistory] = useState(false);
  const requests = visibleHelpRequests(store, history);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(todayLocal());
  const [end, setEnd] = useState(todayLocal());
  const [locker, setLocker] = useState<string>(LOCKERS[0].id);
  const act = (c: Parameters<typeof perform>[0]) => {
    const result = perform(c);
    setError(result.ok ? "" : result.error);
    return result.ok;
  };
  return (
    <Modal title="Ask for help" onClose={onClose}>
      <p>
        Provisional local preview. Requests and offers stay in this browser. Any
        other preview owner may offer a listed item.
      </p>
      <ErrorText text={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            act({
              type: "post-help",
              id: uid(),
              title,
              description,
              start,
              end,
            })
          ) {
            setTitle("");
            setDescription("");
          }
        }}
      >
        <label>
          Desired item
          <input
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Brief description
          <textarea
            required
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Receive on
          <input
            type="date"
            required
            min={todayLocal()}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Return on
          <input
            type="date"
            required
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button className="button primary">Post request</button>
      </form>
      <div className="button-row" aria-label="Request views">
        <button className="button" aria-pressed={!history} onClick={() => setHistory(false)}>Community requests</button>
        <button className="button" aria-pressed={history} onClick={() => setHistory(true)}>Your request history</button>
      </div>
      <h3>{history ? "Your request history" : "Community requests"}</h3>
      {!requests.length && <p>{history ? "No historical requests yet." : "No open requests yet."}</p>}
      {requests.map((r) => (
        <section className="plan-details" key={r.id}>
          <h3>{r.title}</h3>
          <p>{r.description}</p>
          <p>
            {r.start} → {r.end} · {helpOutcome(store, r)}
          </p>
          {r.loanId && (
            <button className="button" onClick={() => onLoan(r.loanId!)}>
              View loan
            </button>
          )}
          {r.status === "open" &&
            (r.borrowerId === store.activeUserId ? (
              <>
                <button
                  className="button"
                  onClick={() => act({ type: "close-help", id: r.id })}
                >
                  Close request
                </button>
                <label>
                  Collection and return locker
                  <select
                    value={locker}
                    onChange={(e) => setLocker(e.target.value)}
                  >
                    {LOCKERS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!(store.offers ?? []).some(
                  (o) => o.requestId === r.id && !o.withdrawn,
                ) && <p>No offers yet.</p>}
                {(store.offers ?? [])
                  .filter((o) => o.requestId === r.id && !o.withdrawn)
                  .map((o) => (
                    <div key={o.id}>
                      <p>
                        {store.items.find((i) => i.id === o.itemId)?.name} ·{" "}
                        {store.people.find((p) => p.id === o.ownerId)?.name}
                      </p>
                      <button
                        className="button"
                        onClick={() => {
                          const loanId = uid();
                          if (
                            act({
                              type: "select-offer",
                              id: o.id,
                              loanId,
                              lockerId: locker,
                            })
                          )
                            onLoan(loanId);
                        }}
                      >
                        Choose offer and request loan
                      </button>
                    </div>
                  ))}
              </>
            ) : (
              <>
                <p>
                  Choose a suitable item you own. Availability is checked again
                  when selected.
                </p>
                {store.items
                  .filter((i) => i.listed && i.ownerId === store.activeUserId)
                  .map((i) => {
                    const offer = (store.offers ?? []).find(
                      (o) =>
                        o.requestId === r.id &&
                        o.itemId === i.id &&
                        !o.withdrawn,
                    );
                    return (
                      <div key={i.id}>
                        <span>{i.name} </span>
                        {offer ? (
                          <button
                            className="button"
                            onClick={() =>
                              act({ type: "withdraw-offer", id: offer.id })
                            }
                          >
                            Withdraw offer
                          </button>
                        ) : (
                          <button
                            className="button"
                            onClick={() =>
                              act({
                                type: "offer-help",
                                id: uid(),
                                requestId: r.id,
                                itemId: i.id,
                              })
                            }
                          >
                            Offer item
                          </button>
                        )}
                      </div>
                    );
                  })}
              </>
            ))}
        </section>
      ))}
    </Modal>
  );
}
