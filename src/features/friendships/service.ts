import type { DataGateway } from "../../core/gateway";
import { friendFrom } from "../../core/mappers";
import type { Friendship } from "../../core/types";
export const distinctFriends = (edges: Friendship[], userId: string) => [
  ...new Set(
    edges
      .filter((f) => f.status === "accepted")
      .map((f) => (f.requesterId === userId ? f.recipientId : f.requesterId)),
  ),
];
export function makeFriendshipsService(api: DataGateway) {
  return {
    async getRequests() {
      return (await api.list("friendships")).map(friendFrom);
    },
    async getFriends(userId: string) {
      return distinctFriends(
        (await api.list("friendships")).map(friendFrom),
        userId,
      );
    },
    async requestFriend(actorId: string, recipientId: string) {
      // Reject a friendship request addressed to the current user.
      if (actorId === recipientId) throw new Error("Choose another user.");
      await api.insert("friendships", {
        requester_id: actorId,
        recipient_id: recipientId,
      });
    },
    async acceptRequest(id: string) {
      await api.update("friendships", id, { status: "accepted" });
    },
    async rejectRequest(id: string) {
      await api.remove("friendships", id);
    },
  };
}
