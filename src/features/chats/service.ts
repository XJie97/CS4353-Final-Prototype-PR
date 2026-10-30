import type { DataGateway, Row } from "../../core/gateway";
import { chatFrom, messageFrom } from "../../core/mappers";
import { imageExtension } from "../../core/errors";
export function makeChatsService(api: DataGateway) {
  return {
    async getChats() {
      return (await api.rpc<Row[]>("get_chat_summaries")).map(chatFrom);
    },
    async getChat(id: string) {
      const [r] = await api.list("chats", { eq: { id } });
      return r || null;
    },
    async createChat(actorId: string, otherId: string) {
      return api.insert("chats", {
        user_one_id: actorId,
        user_two_id: otherId,
      });
    },
    async getMessages(chatId: string) {
      return (
        await api.list("messages", {
          eq: { chat_id: chatId },
          order: "created_at",
          limit: 200,
        })
      )
        .map(messageFrom)
        .reverse();
    },
    async attachImage(chatId: string, actorId: string, file: File) {
      return api.upload(
        "chat-images",
        `${chatId}/${actorId}/${crypto.randomUUID()}.${imageExtension(file)}`,
        file,
      );
    },
    async sendMessage(
      chatId: string,
      body: string,
      imagePath: string | null,
      requestId: string,
    ) {
      if (!body.trim() && !imagePath)
        throw new Error("Enter a message or choose an image.");
      return api.rpc("send_message", {
        target_chat: chatId,
        text_body: body,
        request_id: requestId,
        image_path_value: imagePath,
      });
    },
    subscribe: (chatId: string | undefined, onChange: () => void) =>
      api.subscribe(
        "messages",
        chatId ? `chat_id=eq.${chatId}` : undefined,
        onChange,
      ),
  };
}
