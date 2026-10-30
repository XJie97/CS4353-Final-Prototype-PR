import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../features/auth/context";
import { services } from "../core/services";
import { distinctFriends } from "../features/friendships/service";
import { useCommand } from "../core/query";
import { useUsers } from "../core/hooks";
import { MutationState, QueryState } from "../core/ui";
import { Conversation } from "../features/chats/Conversation";
import { ReviewList } from "../features/reviews/ReviewList";
export default function FriendsPage() {
  const actor = useAuth();
  const cache = useQueryClient();
  const users = useUsers();
  const [section, setSection] = useState<"people" | "chats">("people");
  const [chatId, setChatId] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const requests = useQuery({
    queryKey: ["friends", "requests", actor.id],
    queryFn: () => services.friends.getRequests(),
  });
  const chats = useQuery({
    queryKey: ["chats", "list"],
    queryFn: () => services.chats.getChats(),
    enabled: section === "chats",
  });
  useEffect(() => {
    if (section !== "chats") return;
    return services.chats.subscribe(undefined, () => {
      void cache.invalidateQueries({ queryKey: ["chats"] });
    });
  }, [section, cache]);
  const request = useCommand("friends", async (id: string) =>
    services.friends.requestFriend(actor.id!, id),
  );
  const accept = useCommand("friends", async (id: string) =>
    services.friends.acceptRequest(id),
  );
  const reject = useCommand("friends", async (id: string) =>
    services.friends.rejectRequest(id),
  );
  const createChat = useCommand("chats", async (id: string) => {
    const c = await services.chats.createChat(actor.id!, id);
    setChatId(c.id);
    setSection("chats");
  });
  const friendIds = distinctFriends(requests.data || [], actor.id!);
  const name = (id: string) => users.data?.find((u) => u.id === id)?.name || id;
  if (chatId)
    return (
      <Conversation key={chatId} id={chatId} close={() => setChatId(null)} />
    );
  if (profile) {
    const u = users.data?.find((x) => x.id === profile);
    return (
      <section>
        <button onClick={() => setProfile(null)}>Back to people</button>
        <h3>{u?.name || profile}</h3>
        <p>{u?.username}</p>
        <ReviewList ownerId={profile} />
      </section>
    );
  }
  return (
    <section>
      <h2>Friends</h2>
      <div className="actions">
        <button onClick={() => setSection("people")}>People</button>
        <button onClick={() => setSection("chats")}>Conversations</button>
      </div>
      {section === "people" ? (
        <>
          <label>
            Find user
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <QueryState query={requests}>
            <h3>Requests</h3>
            {requests.data
              ?.filter((f) => f.status === "pending")
              .map((f) => (
                <p key={f.id}>
                  {name(f.requesterId)} → {name(f.recipientId)}{" "}
                  {f.recipientId === actor.id ? (
                    <>
                      <button
                        disabled={accept.isPending}
                        onClick={() => accept.mutate(f.id)}
                      >
                        Accept
                      </button>
                      <button
                        disabled={reject.isPending}
                        onClick={() => reject.mutate(f.id)}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(f.id)}
                    >
                      Cancel request
                    </button>
                  )}
                </p>
              ))}
          </QueryState>
          <MutationState mutation={accept} />
          <MutationState mutation={reject} />
          <h3>Users ({friendIds.length} friends)</h3>
          <QueryState query={users}>
            {users.data
              ?.filter(
                (u) =>
                  u.id !== actor.id &&
                  `${u.name} ${u.username || ""}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((u) => (
                <article key={u.id}>
                  <strong>{u.name || u.username || u.id}</strong>
                  <p>
                    {friendIds.includes(u.id)
                      ? "Accepted friend"
                      : "Not friends"}
                  </p>
                  <div className="actions">
                    <button onClick={() => setProfile(u.id)}>
                      Profile/reviews
                    </button>
                    {!friendIds.includes(u.id) && (
                      <button
                        disabled={request.isPending}
                        onClick={() => request.mutate(u.id)}
                      >
                        Add friend
                      </button>
                    )}
                    <button
                      disabled={createChat.isPending}
                      onClick={() => createChat.mutate(u.id)}
                    >
                      New conversation
                    </button>
                  </div>
                </article>
              ))}
          </QueryState>
          <MutationState mutation={request} />
          <MutationState mutation={createChat} />
        </>
      ) : (
        <QueryState query={chats}>
          {chats.data?.length ? (
            chats.data.map((c) => (
              <article key={c.id}>
                <strong>{name(c.otherUserId)}</strong>
                <p>
                  {c.lastMessage || (c.hasImage ? "Image" : "No messages")} ·{" "}
                  {new Date(c.lastAt).toLocaleString()}
                </p>
                <button onClick={() => setChatId(c.id)}>
                  Open conversation
                </button>
              </article>
            ))
          ) : (
            <p>No conversations. Start one from People.</p>
          )}
        </QueryState>
      )}
    </section>
  );
}
