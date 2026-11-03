import { useQuery } from "@tanstack/react-query";
import { services } from "../../core/services";
import { useCommand } from "../../core/query";
import { MutationState, QueryState, formAction, value } from "../../core/ui";
export function SpriteEditor({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["sprites", id],
    queryFn: () => services.users.getSprite(id),
  });
  const save = useCommand("users", async (fd: FormData) =>
    services.users.updateSprite(
      id,
      value(fd, "colour"),
      query.data?.category === "user" ? value(fd, "head") : undefined,
      value(fd, "torso"),
      Number(fd.get("level")),
    ),
  );
  return (
    <QueryState query={query}>
      {query.data && (
        <form className="stack" onSubmit={formAction((fd) => save.mutate(fd))}>
          <label>
            Colour code
            <input
              name="colour"
              required
              pattern="#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})"
              defaultValue={query.data.colour}
            />
          </label>
          {query.data.category === "user" && (
            <>
              <label>
                Head asset ID
                <input
                  name="head"
                  required
                  defaultValue={query.data.headAssetId || ""}
                />
              </label>
              <label>
                Torso asset ID
                <input
                  name="torso"
                  required
                  defaultValue={query.data.torsoAssetId || ""}
                />
              </label>
              <label>
                Level
                <input
                  name="level"
                  type="number"
                  min={0}
                  step={1}
                  required
                  defaultValue={query.data.level || 0}
                />
              </label>
            </>
          )}
          <button disabled={save.isPending}>Save sprite</button>
          <MutationState mutation={save} />
        </form>
      )}
    </QueryState>
  );
}
