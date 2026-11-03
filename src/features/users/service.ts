import type { DataGateway } from "../../core/gateway";
import { userFrom, spriteFrom } from "../../core/mappers";
import { imageExtension, requireText } from "../../core/errors";
export function makeUsersService(api: DataGateway) {
  return {
    async getUsers() {
      return (await api.list("profiles")).map(userFrom);
    },
    async getUser(id: string) {
      const [r] = await api.list("profiles", { eq: { id } });
      return r ? userFrom(r) : null;
    },
    async getSprite(id: string) {
      const [r] = await api.list("sprites", { eq: { id } });
      return r ? spriteFrom(r) : null;
    },
    async updateProfile(id: string, name: string, username: string) {
      await api.update("profiles", id, {
        display_name: requireText(name, "Name"),
        username: username.trim() || null,
      });
    },
    async updateSprite(
      id: string,
      colour: string,
      head?: string,
      torso?: string,
      level?: number,
    ) {
      await api.update("sprites", id, {
        colour,
        ...(head === undefined
          ? {}
          : { head_asset_id: head, torso_asset_id: torso, level }),
      });
    },
    async updateAvatar(userId: string, file: File) {
      const path = `${userId}/${crypto.randomUUID()}.${imageExtension(file)}`;
      await api.upload("profile-images", path, file);
      try {
        await api.update("profiles", userId, { avatar_path: path });
      } catch (e) {
        await api.removeFile("profile-images", path).catch(() => {});
        throw e;
      }
    },
  };
}
