import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { services } from "../core/services";
import { useItem, useLockers, useUser } from "../core/hooks";
import { useAuth } from "../features/auth/context";
import { useCommand } from "../core/query";
import {
  Choices,
  FileLink,
  ImageInput,
  MutationState,
  QueryState,
  fileValue,
  formAction,
  numbers,
  value,
} from "../core/ui";
import { today } from "../core/types";
import { navigate } from "../core/router";
import { ReviewList } from "../features/reviews/ReviewList";
export function ItemDetails({ id, close }: { id: string; close: () => void }) {
  const item = useItem(id);
  const lockers = useLockers();
  const actor = useAuth();
  const owner = useUser(item.data?.ownerId || "");
  const images = useQuery({
    queryKey: ["items", "images", id],
    queryFn: () => services.items.getImages(id),
  });
  const friends = useQuery({
    queryKey: ["friends", "ids", actor.id],
    queryFn: () => services.friends.getFriends(actor.id!),
  });
  const addPhoto = useCommand("items", async (file: File) =>
    services.items.addImage(id, actor.id!, file),
  );
  const setLockers = useCommand("items", async (ids: number[]) =>
    services.items.setLockers(id, ids),
  );
  const request = useCommand("loans", async (fd: FormData) => {
    await services.loans.createLoan(id, {
      startsOn: value(fd, "start"),
      dueOn: value(fd, "end"),
      lockerId: Number(fd.get("locker")),
    });
    navigate("loans");
  });
  const [showPlan, setShowPlan] = useState(false);
  return (
    <section>
      <button onClick={close}>Back to list</button>
      <QueryState query={item}>
        {item.data && (
          <>
            <h2>{item.data.name}</h2>
            <p>Owner: {owner.data?.name || item.data.ownerId}</p>
            <p>{item.data.description}</p>
            <p>Status: {item.data.status.replaceAll("_", " ")}</p>
            <p>Categories: {item.data.tags.join(", ") || "None"}</p>
            <p>
              Lockers:{" "}
              {item.data.lockerIds.map((x) => `location${x}`).join(", ") ||
                "Legacy item: owner must select lockers"}
            </p>
            <QueryState query={images}>
              {images.data?.map((x) => (
                <FileLink key={x.id} bucket="item-images" path={x.path} />
              ))}
            </QueryState>
            {item.data.ownerId === actor.id ? (
              <>
                <form
                  className="stack"
                  onSubmit={formAction((fd) => {
                    const f = fileValue(fd, "image");
                    if (f) addPhoto.mutate(f);
                  })}
                >
                  <label>
                    Add image
                    <ImageInput required />
                  </label>
                  <button disabled={addPhoto.isPending}>Upload</button>
                  <MutationState mutation={addPhoto} />
                </form>
                <form
                  className="stack"
                  key={item.data.lockerIds.join(",")}
                  onSubmit={formAction((fd) =>
                    setLockers.mutate(numbers(fd, "lockers")),
                  )}
                >
                  <fieldset>
                    <legend>Allowed lockers</legend>
                    <QueryState query={lockers}>
                      <Choices
                        options={lockers.data || []}
                        name="lockers"
                        defaults={item.data.lockerIds}
                      />
                    </QueryState>
                  </fieldset>
                  <button disabled={setLockers.isPending}>Save lockers</button>
                  <MutationState mutation={setLockers} />
                </form>
              </>
            ) : (
              <>
                <button
                  disabled={!friends.data?.includes(item.data.ownerId)}
                  onClick={() => setShowPlan(!showPlan)}
                >
                  Propose loan
                </button>
                {!friends.data?.includes(item.data.ownerId) && (
                  <p>Become accepted friends before requesting a loan.</p>
                )}
                {showPlan && (
                  <form
                    className="stack"
                    onSubmit={formAction((fd) => request.mutate(fd))}
                  >
                    <label>
                      Start
                      <input
                        type="date"
                        name="start"
                        defaultValue={today()}
                        required
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="date"
                        name="end"
                        defaultValue={today()}
                        required
                      />
                    </label>
                    <label>
                      Locker
                      <select name="locker" required>
                        {item.data.lockerIds.map((x) => (
                          <option key={x} value={x}>
                            location{x}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      disabled={
                        request.isPending || !item.data.lockerIds.length
                      }
                    >
                      Request loan
                    </button>
                    <MutationState mutation={request} />
                  </form>
                )}
              </>
            )}
            <ReviewList itemId={id} />
          </>
        )}
      </QueryState>
    </section>
  );
}
