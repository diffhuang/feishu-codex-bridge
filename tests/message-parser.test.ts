import { describe, expect, it } from "vitest";
import { parseMessageEvent } from "../src/feishu/message-parser";

describe("parseMessageEvent", () => {
  it("extracts a normalized text request", () => {
    const request = parseMessageEvent({
      header: { event_id: "evt_1" },
      event: {
        message: {
          message_id: "om_1",
          message_type: "text",
          chat_type: "p2p",
          content: JSON.stringify({ text: "ping" }),
        },
        sender: { sender_id: { open_id: "ou_1" } },
        chat_id: "oc_1",
      },
    });

    expect(request.feishuMessageId).toBe("om_1");
    expect(request.senderOpenId).toBe("ou_1");
    expect(request.text).toBe("ping");
  });

  it("extracts a normalized request from a long connection payload", () => {
    const request = parseMessageEvent({
      event_id: "evt_2",
      message: {
        chat_id: "oc_2",
        chat_type: "p2p",
        content: JSON.stringify({ text: "hello" }),
        create_time: "1",
        message_id: "om_2",
        message_type: "text",
      },
      sender: {
        sender_id: {
          open_id: "ou_2",
        },
        sender_type: "user",
      },
    });

    expect(request.feishuMessageId).toBe("om_2");
    expect(request.senderOpenId).toBe("ou_2");
    expect(request.text).toBe("hello");
  });

  it("does not throw on non-text payload content before guard evaluation", () => {
    const request = parseMessageEvent({
      event_id: "evt_3",
      message: {
        chat_id: "oc_3",
        chat_type: "p2p",
        content: "not-json",
        create_time: "1",
        message_id: "om_3",
        message_type: "image",
      },
      sender: {
        sender_id: {
          open_id: "ou_3",
        },
        sender_type: "user",
      },
    });

    expect(request.messageType).toBe("image");
    expect(request.text).toBe("not-json");
  });
});
