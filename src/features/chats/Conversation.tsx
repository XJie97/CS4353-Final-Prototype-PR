import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/context";
import { services } from "../../core/services";
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
import { useUsers } from "../../core/hooks";
export function Conversation({ id, close }: { id: string; close: () => void }) {
  const actor = useAuth();
  const cache = useQueryClient();
  const users = useUsers();
  const draft = useRef<{ payload: string; requestId: string } | null>(null);
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const chat = useQuery({
    queryKey: ["chats", "detail", id],
    queryFn: () => services.chats.getChat(id),
  });
  const messages = useQuery({
    queryKey: ["messages", id],
    queryFn: () => services.chats.getMessages(id),
  });
  useEffect(
    () =>
      services.chats.subscribe(id, () => {
        void cache.invalidateQueries({ queryKey: ["messages", id] });
        void cache.invalidateQueries({ queryKey: ["chats"] });
      }),
    [id, cache],
  );
  const send = useCommand("chats", async (fd: FormData) => {
    const file = fileValue(fd, "image");
    let path: string | null = null;
    if (file) {
      if (uploaded.current?.file !== file)
        uploaded.current = {
          file,
          path: await services.chats.attachImage(id, actor.id!, file),
        };
      path = uploaded.current.path;
    }
    const body = value(fd, "body");
    const payload = JSON.stringify([body, path]);
    if (draft.current?.payload !== payload)
      draft.current = { payload, requestId: crypto.randomUUID() };
    await services.chats.sendMessage(id, body, path, draft.current.requestId);
    draft.current = null;
    uploaded.current = null;
    form.current?.reset();
  });
  return (
    <section>
      <button onClick={close}>Back to conversations</button>
      <h3>Conversation</h3>
      <QueryState query={chat}>
        {chat.data ? (
          <>
            <QueryState query={messages}>
              {messages.data?.length ? (
                messages.data.map((m) => (
                  <article key={m.id}>
                    <p>
                      <strong>
                        {users.data?.find((u) => u.id === m.senderId)?.name ||
                          m.senderId}
                      </strong>{" "}
                      · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="message-body">{m.body}</p>
                    <FileLink bucket="chat-images" path={m.imagePath} />
                  </article>
                ))
              ) : (
                <p>No messages yet.</p>
              )}
            </QueryState>
            <form
              ref={form}
              className="stack"
              onSubmit={formAction((fd) => send.mutate(fd))}
            >
              <label>
                Message
                <textarea
                  name="body"
                  maxLength={5000}
                  disabled={send.isPending}
                />
              </label>
              <label>
                Optional image
                <ImageInput />
              </label>
              <button disabled={send.isPending}>Send message</button>
              <MutationState mutation={send} />
            </form>
            <button onClick={() => void messages.refetch()}>
              Refresh messages
            </button>
            <small>
              Live updates reconnect automatically. Showing the latest 200
              messages.
            </small>
          </>
        ) : (
          <p>Chat not found.</p>
        )}
      </QueryState>
    </section>
  );
}
