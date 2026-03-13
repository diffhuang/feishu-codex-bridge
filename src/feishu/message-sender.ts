import type { SenderPayload } from "../bridge/orchestrator";

type FeishuMessageClient = {
  im: {
    v1: {
      message: {
        create: (payload: {
          data: {
            content: string;
            msg_type: "text";
            receive_id: string;
          };
          params: {
            receive_id_type: "chat_id";
          };
        }) => Promise<unknown>;
        update: (payload: {
          data: {
            content: string;
            msg_type: "text";
          };
          path: {
            message_id: string;
          };
        }) => Promise<unknown>;
      };
      messageReaction: {
        create: (payload: {
          data: {
            reaction_type: {
              emoji_type: string;
            };
          };
          path: {
            message_id: string;
          };
        }) => Promise<unknown>;
      };
    };
  };
};

export type SentMessage = {
  messageId?: string;
};

export type TextUpdatePayload = {
  messageId: string;
  text: string;
};

export type MessageReactionPayload = {
  emojiType: string;
  messageId: string;
};

export type MessageSender = {
  addReaction: (payload: MessageReactionPayload) => Promise<void>;
  sendText: (payload: SenderPayload) => Promise<SentMessage>;
  updateText: (payload: TextUpdatePayload) => Promise<void>;
};

export function formatReplyContent(text: string): string {
  return JSON.stringify({ text });
}

export function createMessageSender(client: FeishuMessageClient): MessageSender {
  return {
    async addReaction(payload: MessageReactionPayload): Promise<void> {
      await client.im.v1.messageReaction.create({
        data: {
          reaction_type: {
            emoji_type: payload.emojiType,
          },
        },
        path: {
          message_id: payload.messageId,
        },
      });
    },
    async sendText(payload: SenderPayload): Promise<SentMessage> {
      const response = (await client.im.v1.message.create({
        data: {
          content: formatReplyContent(payload.text),
          msg_type: "text",
          receive_id: payload.chatId,
        },
        params: {
          receive_id_type: "chat_id",
        },
      })) as { data?: { message_id?: string } } | null;

      return {
        messageId: response?.data?.message_id,
      };
    },
    async updateText(payload: TextUpdatePayload): Promise<void> {
      await client.im.v1.message.update({
        data: {
          content: formatReplyContent(payload.text),
          msg_type: "text",
        },
        path: {
          message_id: payload.messageId,
        },
      });
    },
  };
}
