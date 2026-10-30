import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../features/auth/context";
import { services } from "../core/services";
import { useUser } from "../core/hooks";
import { useCommand } from "../core/query";
import {
  FileLink,
  ImageInput,
  MutationState,
  QueryState,
  fileValue,
  formAction,
  value,
} from "../core/ui";
import { SpriteEditor } from "../features/users/SpriteEditor";
import { ReviewList } from "../features/reviews/ReviewList";
export default function MePage() {
  const actor = useAuth();
  const profile = useUser(actor.id!);
  const items = useQuery({
    queryKey: ["items", "owned", actor.id],
    queryFn: () => services.items.getItems({ ownerId: actor.id! }),
  });
  const save = useCommand("users", async (fd: FormData) =>
    services.users.updateProfile(
      actor.id!,
      value(fd, "name"),
      value(fd, "username"),
    ),
  );
  const avatar = useCommand("users", async (fd: FormData) => {
    const file = fileValue(fd, "image");
    if (!file) throw new Error("Choose an image.");
    await services.users.updateAvatar(actor.id!, file);
  });
  const signOut = useCommand("users", async () => services.auth.signOut());
  return (
    <section>
      <h2>Me</h2>
      <p>{actor.email}</p>
      <QueryState query={profile}>
        {profile.data && (
          <>
            <form
              className="stack"
              onSubmit={formAction((fd) => save.mutate(fd))}
            >
              <label>
                Name
                <input
                  name="name"
                  defaultValue={profile.data.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                Username
                <input
                  name="username"
                  defaultValue={profile.data.username || ""}
                  pattern="[a-z0-9_]{3,30}"
                />
              </label>
              <button disabled={save.isPending}>Save profile</button>
              <MutationState mutation={save} />
            </form>
            <FileLink bucket="profile-images" path={profile.data.avatarPath} />
            <form
              className="stack"
              onSubmit={formAction((fd) => avatar.mutate(fd))}
            >
              <label>
                Avatar photo
                <ImageInput required />
              </label>
              <button disabled={avatar.isPending}>Save avatar image</button>
              <MutationState mutation={avatar} />
            </form>
            <h3>My sprite</h3>
            <SpriteEditor id={profile.data.spriteId} />
          </>
        )}
      </QueryState>
      <h3>Item sprites</h3>
      <QueryState query={items}>
        {items.data?.map((i) => (
          <details key={i.id}>
            <summary>{i.name}</summary>
            <SpriteEditor id={i.spriteId} />
          </details>
        ))}
      </QueryState>
      <ReviewList ownerId={actor.id!} />
      <button disabled={signOut.isPending} onClick={() => signOut.mutate()}>
        Sign out
      </button>
      <MutationState mutation={signOut} />
    </section>
  );
}
