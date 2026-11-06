import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { CameraCapture } from "../../core/CameraCapture";
import { services } from "../../core/services";
import { useAuth } from "../auth/context";
import { useItem, useLoan, useUser } from "../../core/hooks";
import { useCommand } from "../../core/query";
import {
  FileLink,
  ImageInput,
  MutationState,
  QueryState,
  fileValue,
  formAction,
  value,
} from "../../core/ui";
import {
  COMPLIMENTS,
  STEPS,
  STEP_LABELS,
  stepActor,
  type Loan,
  type QrChallenge,
  type PhotoStep,
} from "../../core/types";

export function LoanDetails({ id, close }: { id: string; close: () => void }) {
  const query = useLoan(id);
  const actor = useAuth();
  const [qr, setQr] = useState<QrChallenge | null>(null);
  const [edit, setEdit] = useState(false);
  const [capture, setCapture] = useState(false);
  const loan = query.data;
  const item = useItem(loan?.itemId || "");
  const owner = useUser(loan?.ownerId || "");
  const borrower = useUser(loan?.borrowerId || "");
  const approve = useCommand("loans", async () =>
    services.loans.approvePlan(id, loan!.revision),
  );
  const cancel = useCommand("loans", async () =>
    services.loans.cancelLoan(id, loan!.revision),
  );
  const modify = useCommand("loans", async (fd: FormData) => {
    await services.loans.modifyLoan(id, loan!.revision, {
      startsOn: value(fd, "start"),
      dueOn: value(fd, "end"),
      lockerId: Number(fd.get("locker")),
    });
    setQr(null);
    setEdit(false);
  });
  const getQr = useCommand("handoff", async () => {
    setQr(await services.handoff.getQr(loan!));
  });
  const scan = useCommand("handoff", async () => {
    await services.handoff.simulateScan(qr!);
    setQr(null);
    setCapture(true);
  });
  useEffect(() => {
    if (loan?.pendingPhoto && stepActor(loan, loan.pendingPhoto) === actor.id)
      setCapture(true);
  }, [loan?.pendingPhoto, actor.id]);
  if (
    capture &&
    loan?.pendingPhoto &&
    stepActor(loan, loan.pendingPhoto) === actor.id
  )
    return (
      <PhotoCapture
        loan={loan}
        step={loan.pendingPhoto}
        back={() => setCapture(false)}
      />
    );
  return (
    <section>
      <button onClick={close}>Back to loans</button>
      <QueryState query={query}>
        {loan && (
          <>
            <h3>{item.data?.name || "Loan"}</h3>
            <p>
              Owner: {owner.data?.name || loan.ownerId} · Borrower:{" "}
              {borrower.data?.name || loan.borrowerId}
            </p>
            <p>
              {loan.startsOn} to {loan.dueOn} ·{" "}
              {loan.lockerId
                ? `location${loan.lockerId}`
                : "Legacy loan: locker not assigned"}
            </p>
            <p>
              Status: {loan.status.replaceAll("_", " ")} · {loan.temporalStatus}
            </p>
            <p>Handoff: {loan.phase.replaceAll("_", " ")}</p>
            {loan.pendingPhoto && (
              <p>
                Pending photo: {STEP_LABELS[loan.pendingPhoto]}{" "}
                {stepActor(loan, loan.pendingPhoto) === actor.id && (
                  <button onClick={() => setCapture(true)}>Resume photo</button>
                )}
              </p>
            )}
            {loan.status !== "cancelled" &&
              !loan.photos.borrower_pickup &&
              loan.status !== "on_loan" &&
              loan.status !== "returned" && (
                <div className="actions">
                  {loan.ownerId === actor.id && loan.status === "created" && (
                    <button
                      disabled={approve.isPending}
                      onClick={() => approve.mutate()}
                    >
                      Approve plan
                    </button>
                  )}
                  {loan.borrowerId === actor.id && (
                    <button onClick={() => setEdit(!edit)}>Modify plan</button>
                  )}
                  <button
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          "Cancel this loan? Reservation dates will be released.",
                        )
                      )
                        cancel.mutate();
                    }}
                  >
                    Cancel loan
                  </button>
                </div>
              )}
            <MutationState mutation={approve} />
            <MutationState mutation={cancel} />
            {edit && (
              <form
                className="stack"
                onSubmit={formAction((fd) => modify.mutate(fd))}
              >
                <label>
                  Start
                  <input
                    type="date"
                    name="start"
                    defaultValue={loan.startsOn}
                    required
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    name="end"
                    defaultValue={loan.dueOn}
                    required
                  />
                </label>
                <label>
                  Locker
                  <select
                    name="locker"
                    defaultValue={loan.lockerId || ""}
                    required
                  >
                    {item.data?.lockerIds.map((x) => (
                      <option value={x} key={x}>
                        location{x}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={modify.isPending}>
                  Save and request reapproval
                </button>
                <MutationState mutation={modify} />
              </form>
            )}
            {loan.nextScan && stepActor(loan, loan.nextScan) === actor.id && (
              <section>
                <h4>{STEP_LABELS[loan.nextScan]}</h4>
                <button
                  disabled={getQr.isPending}
                  onClick={() => getQr.mutate()}
                >
                  Get QR
                </button>
                <MutationState mutation={getQr} />
                {qr && (
                  <>
                    <p>
                      Simulation only. This QR does not unlock physical
                      hardware.
                    </p>
                    <QRCodeSVG value={qr.payload} size={120} />
                    <p>Locker: location{qr.lockerId}</p>
                    <button
                      disabled={scan.isPending}
                      onClick={() => scan.mutate()}
                    >
                      Bypass: simulate locker scan
                    </button>
                    <MutationState mutation={scan} />
                  </>
                )}
              </section>
            )}
            <details>
              <summary>Handoff evidence</summary>
              {STEPS.map((s) => (
                <p key={s}>
                  {STEP_LABELS[s]}:{" "}
                  {loan.photos[s] ? (
                    <FileLink
                      bucket="loan-verification"
                      path={loan.photos[s]}
                    />
                  ) : loan.pendingPhoto === s ? (
                    "Photo pending"
                  ) : (
                    "Not recorded"
                  )}
                </p>
              ))}
            </details>
            {loan.status === "returned" &&
              loan.borrowerId === actor.id &&
              (loan.pendingPhoto ? (
                <p>
                  Review is optional. Wait for the final owner photo/checklist.
                </p>
              ) : (
                <LoanReview loan={loan} />
              ))}
          </>
        )}
      </QueryState>
    </section>
  );
}
function PhotoCapture({
  loan,
  step,
  back,
}: {
  loan: Loan;
  step: PhotoStep;
  back: () => void;
}) {
  const [captured, setCaptured] = useState<File | null>(null);
  const saved = useRef<string | null>(null);
  const file = useRef<File | null>(null);
  const input = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  const save = useCommand("handoff", async (fd: FormData) => {
    const chosen = captured;
    if (!chosen) throw new Error("Capture an image first.");
    const answers = fd.getAll("answers").map(String);
    if (
      step === "owner_pickup" &&
      loan.checklist.items.some((x) => !answers.includes(x.id))
    )
      throw new Error("Complete all return checklist entries.");
    if (file.current !== chosen) {
      saved.current = null;
      file.current = chosen;
    }
    if (!saved.current)
      saved.current = await services.handoff.uploadPhoto(loan.id, step, chosen);
    await services.handoff.recordPhoto(loan.id, step, saved.current, answers);
    back();
  });
  return (
    <section>
      <button disabled={save.isPending} onClick={back}>
        Back to loan (photo remains pending)
      </button>
      <h3 ref={input} tabIndex={-1}>
        Photo: {STEP_LABELS[step]}
      </h3>
      <p>
        The scan already advanced the status. Point your camera at the item in
        the locker, take the photo, and save it before the next handoff.
      </p>
      {step === "owner_pickup" && (
        <p>
          The loan is already Returned/Past. Final evidence is still required.
        </p>
      )}
      <form className="stack" onSubmit={formAction((fd) => save.mutate(fd))}>
        <CameraCapture onChange={setCaptured} />
        {step === "owner_pickup" && (
          <fieldset>
            <legend>Return checklist (version {loan.checklist.version})</legend>
            {loan.checklist.items.map((c) => (
              <label className="inline" key={c.id}>
                <input type="checkbox" name="answers" value={c.id} required />
                {c.label}
              </label>
            ))}
          </fieldset>
        )}
        <button disabled={save.isPending || !captured}>
          Save handoff photo
        </button>
        <MutationState mutation={save} />
      </form>
    </section>
  );
}
function LoanReview({ loan }: { loan: Loan }) {
  const review = useQuery({
    queryKey: ["reviews", "loan", loan.id],
    queryFn: () => services.reviews.getOwnReviewForLoan(loan.id),
  });
  const upload = useRef<{ file: File; path: string } | null>(null);
  const save = useCommand("reviews", async (fd: FormData) => {
    const f = fileValue(fd, "image");
    let path = review.data?.imagePath || null;
    if (f) {
      if (upload.current?.file !== f)
        upload.current = {
          file: f,
          path: await services.reviews.uploadImage(loan.id, f),
        };
      path = upload.current.path;
    }
    await services.reviews.saveReview(
      loan.id,
      value(fd, "body"),
      fd.getAll("compliments").map(String),
      path,
    );
  });
  const remove = useCommand("reviews", async () =>
    services.reviews.deleteReview(review.data!.id),
  );
  return (
    <section>
      <h4>Optional review</h4>
      <QueryState query={review}>
        <form
          className="stack"
          key={review.data?.id || "new"}
          onSubmit={formAction((fd) => save.mutate(fd))}
        >
          <label>
            Review
            <textarea
              name="body"
              required
              maxLength={5000}
              defaultValue={review.data?.body || ""}
            />
          </label>
          <fieldset>
            <legend>Compliments</legend>
            {COMPLIMENTS.map((c) => (
              <label className="inline" key={c}>
                <input
                  name="compliments"
                  type="checkbox"
                  value={c}
                  defaultChecked={review.data?.compliments.includes(c)}
                />
                {c}
              </label>
            ))}
          </fieldset>
          <label>
            Optional image
            <ImageInput />
          </label>
          <FileLink
            bucket="loan-review-images"
            path={review.data?.imagePath || null}
          />
          <button disabled={save.isPending}>Save review</button>
          <MutationState mutation={save} />
        </form>
        {review.data && (
          <button
            disabled={remove.isPending}
            onClick={() => {
              if (confirm("Delete your review?")) remove.mutate();
            }}
          >
            Delete review
          </button>
        )}
        <MutationState mutation={remove} />
      </QueryState>
    </section>
  );
}
