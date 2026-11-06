import { useState } from "react";
import { useApp } from "../app/context";
import {
  handoverCode,
  LOCKERS,
  nextProof,
  proofActor,
  PROOF_LABELS,
} from "../app/domain";
import { ErrorText, Glyph, Modal } from "../components/ui/shared";
import { PhotoField } from "../components/ui/PhotoField";
import { QrCode } from "../components/ui/QrCode";

export function LockerFlow({
  loanId,
  onClose,
  onDone,
}: {
  loanId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { store, perform, busy: saving } = useApp();
  const loan = store.loans.find((l) => l.id === loanId);
  const [step] = useState(() => (loan ? nextProof(loan) : undefined));
  const [phase, setPhase] = useState<"code" | "locker" | "photo" | "success">(
    "code",
  );
  const [photo, setPhoto] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const pickup = step === "borrowerPickup" || step === "ownerPickup";
  const previous =
    loan &&
    (step === "borrowerPickup"
      ? loan.proofs.ownerDropoff
      : step === "ownerPickup"
        ? loan.proofs.borrowerDropoff
        : undefined);
  const [lockerNumber, setLockerNumber] = useState(
    previous?.lockerNumber ??
      LOCKERS.find((l) => l.id === loan?.lockerId)?.number ??
      "12",
  );

  // Block unavailable handovers, invalid stages, and the wrong actor; retain the success screen after completion.
  if (
    !loan ||
    !step ||
    (!["ready", "active", "returning"].includes(loan.status) &&
      phase !== "success") ||
    (proofActor(loan, step) !== store.activeUserId && phase !== "success")
  ) {
    return (
      // Explain why this account cannot perform the requested handover stage.
      <Modal title="Handover unavailable" onClose={onClose}>
        <p>
          Only the next participant can complete this handover. Open loan
          details for the current status.
        </p>
      </Modal>
    );
  }

  const expected = handoverCode(loan, step),
    item = store.items.find((i) => i.id === loan.itemId)!;
  return (
    // Guide the assigned participant through QR presentation, locker confirmation, photo, and success.
    <Modal
      title={phase === "success" ? "Verified successfully" : PROOF_LABELS[step]}
      onClose={onClose}
      className="locker-modal"
    >
      <p className="preview-note">
        Locker preview: no physical locker is connected.
      </p>

      {phase === "code" && (
        <>
          <p className="form-item-name">{item.title ?? item.name}</p>
          <QrCode value={expected} />
          <p className="handover-token">{expected}</p>
          <p>Show this QR code to the locker scanner to open your locker.</p>
          <p className="muted">
            For this preview, simulate the external locker scanning your code.
          </p>
          <button
            disabled={saving}
            className="button primary wide"
            type="button"
            onClick={() => {
              setError("");
              setPhase("locker");
            }}
          >
            Simulate locker scan
          </button>
        </>
      )}

      {phase === "locker" && (
        <>
          <p className="locker-location">
            {LOCKERS.find((l) => l.id === loan.lockerId)?.label}
          </p>
          <div className="locker-number">
            Locker
            <strong>{lockerNumber.padStart(2, "0")}</strong>
          </div>
          <p>
            {pickup
              ? "Collect the item from the locker shown above."
              : "Place the item in a locker, then record its number and condition."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              // Require a positive one- or two-digit locker number before continuing.
              if (!/^\d{1,2}$/.test(lockerNumber) || Number(lockerNumber) < 1) {
                setError("Enter a locker number from 1 to 99.");
                return;
              }
              setError("");
              setPhase("photo");
            }}
          >
            <label>
              Locker number
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{1,2}"
                maxLength={2}
                value={lockerNumber}
                readOnly={pickup}
                required
                onChange={(e) => setLockerNumber(e.target.value)}
              />
            </label>
            <ErrorText text={error} />
            <button
              disabled={saving}
              className="button primary wide"
              type="submit"
            >
              Continue to item photo
            </button>
          </form>
        </>
      )}

      {phase === "photo" && (
        <>
          <p>
            Record the item condition{" "}
            {pickup ? "when collecting it" : "before closing the locker"}.
          </p>
          <PhotoField
            label="Item condition photo"
            value={photo}
            onChange={setPhoto}
            onBusyChange={setPhotoBusy}
            required
          />
          <ErrorText text={error} />
          <div className="form-actions">
            <button
              disabled={saving}
              className="button"
              type="button"
              onClick={() => setPhase("locker")}
            >
              Back
            </button>
            <button
              className="button primary"
              type="button"
              disabled={saving || !photo || photoBusy}
              onClick={async () => {
                const result = await perform({
                  type: "record-proof",
                  loanId,
                  step,
                  photo,
                  code: expected,
                  lockerNumber,
                });
                // Keep the handover form open when recording the proof fails.
                if (!result.ok) setError(result.error);
                else setPhase("success");
              }}
            >
              Confirm {pickup ? "pickup" : "drop-off"}
            </button>
          </div>
        </>
      )}

      {phase === "success" && (
        <div className="verification-success">
          <span className="success-icon">
            <Glyph name="check" size={56} />
          </span>
          <h3>{pickup ? "Pickup verified" : "Drop-off verified"}</h3>
          <p>
            {item.title ?? item.name} · Locker {lockerNumber.padStart(2, "0")}
          </p>
          <p className="muted">
            The loan has been updated and the other participant notified.
          </p>
          <button
            disabled={saving}
            className="button primary wide"
            type="button"
            onClick={onDone}
          >
            Back to loan
          </button>
        </div>
      )}
    </Modal>
  );
}
