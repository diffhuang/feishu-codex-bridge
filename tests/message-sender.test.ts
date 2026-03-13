import { describe, expect, it, vi } from "vitest";
import { createMessageSender, formatReplyContent } from "../src/feishu/message-sender";

describe("formatReplyContent", () => {
  it("serializes a text reply payload", () => {
    expect(formatReplyContent("hello")).toBe(JSON.stringify({ text: "hello" }));
  });
});

describe("createMessageSender", () => {
  it("creates a text message and returns the new message id", async () => {
    const client = {
      im: {
        v1: {
          message: {
            create: vi.fn().mockResolvedValue({
              data: {
                message_id: "om_reply_1",
              },
            }),
            update: vi.fn(),
          },
          messageReaction: {
            create: vi.fn(),
          },
        },
      },
    };
    const sender = createMessageSender(client);

    const result = await sender.sendText({
      chatId: "oc_1",
      requestId: "req_1",
      text: "hello",
    });

    expect(client.im.v1.message.create).toHaveBeenCalledWith({
      data: {
        content: JSON.stringify({ text: "hello" }),
        msg_type: "text",
        receive_id: "oc_1",
      },
      params: {
        receive_id_type: "chat_id",
      },
    });
    expect(result).toEqual({ messageId: "om_reply_1" });
  });

  it("updates an existing text message", async () => {
    const client = {
      im: {
        v1: {
          message: {
            create: vi.fn(),
            update: vi.fn().mockResolvedValue({}),
          },
          messageReaction: {
            create: vi.fn(),
          },
        },
      },
    };
    const sender = createMessageSender(client);

    await sender.updateText({
      messageId: "om_progress_1",
      text: "done",
    });

    expect(client.im.v1.message.update).toHaveBeenCalledWith({
      data: {
        content: JSON.stringify({ text: "done" }),
        msg_type: "text",
      },
      path: {
        message_id: "om_progress_1",
      },
    });
  });

  it("adds a reaction to an existing message", async () => {
    const client = {
      im: {
        v1: {
          message: {
            create: vi.fn(),
            update: vi.fn(),
          },
          messageReaction: {
            create: vi.fn().mockResolvedValue({}),
          },
        },
      },
    };
    const sender = createMessageSender(client);

    await sender.addReaction({
      emojiType: "OK",
      messageId: "om_user_1",
    });

    expect(client.im.v1.messageReaction.create).toHaveBeenCalledWith({
      data: {
        reaction_type: {
          emoji_type: "OK",
        },
      },
      path: {
        message_id: "om_user_1",
      },
    });
  });
});
