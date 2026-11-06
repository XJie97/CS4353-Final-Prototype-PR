import { helpOutcome, visibleHelpRequests } from "../app/help-view";
import { useRef, useState } from "react";
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
  const { store, perform, toast, busy: saving } = useApp();
  const [history, setHistory] = useState(false);
  const requests = visibleHelpRequests(store, history);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState(uid);
  const offerIds = useRef(new Map<string, string>());
  const loanIds = useRef(new Map<string, string>());
  const retryId = (ids: Map<string, string>, key: string) => {
    // Allocate one stable record ID per draft key until it is cleared.
    if (!ids.has(key)) ids.set(key, uid());
    return ids.get(key)!;
  };
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(todayLocal());
  const [end, setEnd] = useState(todayLocal());
  const [locker, setLocker] = useState<string>(LOCKERS[0].id);
  const act = async (c: Parameters<typeof perform>[0]) => {
    const result = await perform(c);
    setError(result.ok ? "" : result.error);
    return result.ok;
  };
  return (
    // Combine the new-help-request form with community requests and personal history.
    <Modal title="Ask for help" onClose={onClose}>
      <p>
        Provisional feature. Requests and offers are stored in the shared
        database. Any other participant may offer a listed item.
      </p>
      <ErrorText text={error} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          // Reset the help-request draft only after a successful save.
          if (
            await act({
              type: "post-help",
              id: draftId,
              title,
              description,
              start,
              end,
            })
          ) {
            setTitle("");
            setDescription("");
            setDraftId(uid());
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
        <button disabled={saving} className="button primary">
          Post request
        </button>
      </form>
      <div className="button-row" aria-label="Request views">
        <button
          disabled={saving}
          className="button"
          aria-pressed={!history}
          onClick={() => setHistory(false)}
        >
          Community requests
        </button>
        <button
          disabled={saving}
          className="button"
          aria-pressed={history}
          onClick={() => setHistory(true)}
        >
          Your request history
        </button>
      </div>
      <h3>{history ? "Your request history" : "Community requests"}</h3>
      {!requests.length && (
        <p>
          {history ? "No historical requests yet." : "No open requests yet."}
        </p>
      )}
      {requests.map((r) => (
        // Represent one help request with dates, outcome, and available offer actions.
        <section className="plan-details" key={r.id}>
          <h3>{r.title}</h3>
          <p>{r.description}</p>
          <p>
            {r.start} → {r.end} · {helpOutcome(store, r)}
          </p>
          {r.loanId && (
            <button
              disabled={saving}
              className="button"
              onClick={() => onLoan(r.loanId!)}
            >
              View loan
            </button>
          )}
          {r.status === "open" &&
            (r.borrowerId === store.activeUserId ? (
              <>
                <button
                  disabled={saving}
                  className="button"
                  onClick={async () => {
                    await act({ type: "close-help", id: r.id });
                  }}
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
                      // Represent a supported locker location for the loan created by offer selection.
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
                    // Represent an owner's offered item and the requester's selection action.
                    <div key={o.id}>
                      <p>
                        {store.items.find((i) => i.id === o.itemId)?.name} ·{" "}
                        {store.people.find((p) => p.id === o.ownerId)?.name}
                      </p>
                      <button
                        disabled={saving}
                        className="button"
                        onClick={async () => {
                          const loanId = retryId(loanIds.current, o.id);
                          // Open the linked loan only after the offer is successfully selected.
                          if (
                            await act({
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
                    const offerKey = `${r.id}:${i.id}:${
                      (store.offers ?? []).filter(
                        (o) => o.requestId === r.id && o.itemId === i.id,
                      ).length
                    }`;
                    const offer = (store.offers ?? []).find(
                      (o) =>
                        o.requestId === r.id &&
                        o.itemId === i.id &&
                        !o.withdrawn,
                    );
                    return (
                      // Represent one of the owner's eligible items and its offer or withdrawal action.
                      <div key={i.id}>
                        <span>{i.name} </span>
                        {offer ? (
                          <button
                            disabled={saving}
                            className="button"
                            onClick={async () =>
                              act({ type: "withdraw-offer", id: offer.id })
                            }
                          >
                            Withdraw offer
                          </button>
                        ) : (
                          <button
                            disabled={saving}
                            className="button"
                            onClick={async () =>
                              act({
                                type: "offer-help",
                                id: retryId(offerIds.current, offerKey),
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
