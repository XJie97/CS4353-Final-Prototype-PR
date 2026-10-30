import type { DataGateway } from "../../core/gateway";
import { itemFrom } from "../../core/mappers";
import { imageExtension, requireText } from "../../core/errors";
import type { Locker } from "../../core/types";
export type ItemFilters = {
  ownerId?: string;
  excludeOwnerId?: string;
  tags?: string[];
  lockerIds?: number[];
  friendIds?: string[];
  friendsOnly?: boolean;
  search?: string;
};
export const normalizeTags = (tags: string[]) => [
  ...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
];
export function makeItemsService(api: DataGateway) {
  const service = {
    async getLockers(): Promise<Locker[]> {
      return (await api.list("lockers"))
        .map((r) => ({ id: r.id, name: r.name }))
        .sort((a, b) => a.id - b.id);
    },
    async getItems(f: ItemFilters = {}) {
      const rows = await api.list(
        "item_catalog",
        f.ownerId ? { eq: { owner_id: f.ownerId } } : {},
      );
      const links = rows.length
        ? await api.list("item_lockers", {
            in: { item_id: rows.map((r) => r.id) },
          })
        : [];
      return rows
        .map((r) =>
          itemFrom(
            r,
            links.filter((l) => l.item_id === r.id).map((l) => l.locker_id),
          ),
        )
        .filter(
          (i) =>
            (!f.excludeOwnerId || i.ownerId !== f.excludeOwnerId) &&
            (!f.friendsOnly || (f.friendIds || []).includes(i.ownerId)) &&
            (!f.tags?.length ||
              f.tags.some((t) => i.tags.includes(t.toLowerCase()))) &&
            (!f.lockerIds?.length ||
              f.lockerIds.some((id) => i.lockerIds.includes(id))) &&
            (!f.search ||
              `${i.name} ${i.description}`
                .toLowerCase()
                .includes(f.search.toLowerCase())),
        );
    },
    async getItem(id: string) {
      const [r] = await api.list("item_catalog", { eq: { id } });
      if (!r) return null;
      const links = await api.list("item_lockers", { eq: { item_id: id } });
      return itemFrom(
        r,
        links.map((l) => l.locker_id),
      );
    },
    async createItem(
      name: string,
      description: string,
      tags: string[],
      lockerIds: number[],
    ) {
      if (!lockerIds.length) throw new Error("Select at least one locker.");
      const response = await api.rpc<{ id: string } | { id: string }[]>(
        "create_item",
        {
          item_name: requireText(name, "Item name"),
          description_text: description,
          tags: normalizeTags(tags),
          locker_ids: lockerIds,
        },
      );
      const result = Array.isArray(response) ? response[0] : response;
      if (!result?.id)
        throw new Error(
          "Item response was incomplete. Refresh to check the saved item.",
        );
      return result;
    },
    async setLockers(id: string, lockerIds: number[]) {
      await api.rpc("set_item_lockers", { target: id, locker_ids: lockerIds });
    },
    async getImages(itemId: string) {
      return (await api.list("item_images", { eq: { item_id: itemId } })).map(
        (r) => ({ id: r.id, path: r.storage_path }),
      );
    },
    async addImage(itemId: string, actorId: string, file: File) {
      const path = `${actorId}/${itemId}/${crypto.randomUUID()}.${imageExtension(file)}`;
      await api.upload("item-images", path, file);
      try {
        await api.insert("item_images", {
          item_id: itemId,
          storage_path: path,
        });
      } catch (e) {
        await api.removeFile("item-images", path).catch(() => {});
        throw e;
      }
    },
  };
  return service;
}
