import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../features/auth/context";
import { services } from "../core/services";
import { useLockers } from "../core/hooks";
import { useCommand } from "../core/query";
import {
  Choices,
  MutationState,
  QueryState,
  formAction,
  numbers,
  value,
} from "../core/ui";
import { ItemDetails } from "./ItemDetails";
export default function SharePage() {
  const actor = useAuth();
  const lockers = useLockers();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const items = useQuery({
    queryKey: ["items", "owned", actor.id],
    queryFn: () => services.items.getItems({ ownerId: actor.id! }),
  });
  const create = useCommand("items", async (fd: FormData) => {
    const item = await services.items.createItem(
      value(fd, "name"),
      value(fd, "description"),
      value(fd, "tags").split(","),
      numbers(fd, "lockers"),
    );
    setCreating(false);
    setSelected(item.id);
  });
  // Render the selected owned listing's editor instead of the share list.
  if (selected)
    return /* Open the selected owned listing's details from the sharing page. */ <ItemDetails id={selected} close={() => setSelected(null)} />;
  return (
    // Present item creation and the active user's owned listings.
    <section>
      <h2>Share</h2>
      <button onClick={() => setCreating(!creating)}>Create item</button>
      {creating && (
        <form
          className="stack"
          onSubmit={formAction((fd) => create.mutate(fd))}
        >
          <label>
            Name
            <input name="name" required maxLength={200} />
          </label>
          <label>
            Description
            <textarea name="description" maxLength={5000} />
          </label>
          <label>
            Category tags (comma-separated)
            <input name="tags" />
          </label>
          <fieldset>
            <legend>Allowed lockers</legend>
            <QueryState query={lockers}>
              <Choices options={lockers.data || []} name="lockers" />
            </QueryState>
          </fieldset>
          <button disabled={create.isPending}>Save item</button>
          <MutationState mutation={create} />
        </form>
      )}
      <QueryState query={items}>
        {items.data?.length ? (
          items.data.map((i) => (
            // Represent one owned listing with its availability and a link to manage it.
            <article key={i.id}>
              <strong>{i.name}</strong>
              <p>{i.status.replaceAll("_", " ")}</p>
              <button onClick={() => setSelected(i.id)}>Manage item</button>
            </article>
          ))
        ) : (
          <p>No owned items.</p>
        )}
      </QueryState>
    </section>
  );
}
