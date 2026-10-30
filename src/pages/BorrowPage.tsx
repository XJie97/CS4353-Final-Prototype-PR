import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { services } from "../core/services";
import { useAuth } from "../features/auth/context";
import { QueryState } from "../core/ui";
import { useLockers } from "../core/hooks";
import { ItemDetails } from "./ItemDetails";
export default function BorrowPage() {
  const actor = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState("");
  const [locker, setLocker] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const lockers = useLockers();
  const friends = useQuery({
    queryKey: ["friends", "ids", actor.id],
    queryFn: () => services.friends.getFriends(actor.id!),
    enabled: friendsOnly,
  });
  const filters = {
    excludeOwnerId: actor.id!,
    search,
    tags: tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
    lockerIds: locker ? [Number(locker)] : [],
    friendsOnly,
    friendIds: friends.data || [],
  };
  const items = useQuery({
    queryKey: ["items", "browse", filters],
    queryFn: () => services.items.getItems(filters),
    enabled: !friendsOnly || friends.isSuccess,
  });
  if (selected)
    return <ItemDetails id={selected} close={() => setSelected(null)} />;
  return (
    <section>
      <h2>Borrow</h2>
      <div className="filter-bar">
        <label>
          Search
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label>
          Category tags (comma-separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label>
          Locker
          <select value={locker} onChange={(e) => setLocker(e.target.value)}>
            <option value="">All lockers</option>
            {lockers.data?.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={friendsOnly}
            onChange={(e) => setFriendsOnly(e.target.checked)}
          />
          Friends only
        </label>
      </div>
      {friendsOnly && friends.isError ? (
        <QueryState query={friends}>{null}</QueryState>
      ) : (
        <QueryState query={items}>
          {items.data?.length ? (
            items.data.map((i) => (
              <article key={i.id}>
                <strong>{i.name}</strong>
                <p>
                  {i.status.replaceAll("_", " ")} · {i.tags.join(", ")} ·{" "}
                  {i.lockerIds.map((x) => `location${x}`).join(", ")}
                </p>
                <button onClick={() => setSelected(i.id)}>Open item</button>
              </article>
            ))
          ) : (
            <p>No matching items.</p>
          )}
        </QueryState>
      )}
    </section>
  );
}
