import { describe, expect, it, vi } from "vitest";
import { createInMemorySessionStore } from "../src/bridge/session-store";
import { createMessageHandler } from "../src/bridge/message-handler";

describe("createMessageHandler", () => {
  it("adds a reaction to a normal request before the orchestrator finishes", async () => {
    let resolved = false;
    const sender = {
      addReaction: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_ack_1" }),
      updateText: vi.fn(),
    };
    const handler = createMessageHandler({
      allowedOpenIds: ["ou_1"],
      maxInputChars: 1000,
      orchestrator: {
        handleRequest: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              // Intentionally never resolves in this test.
            }),
        ),
      },
      sessionStore: createInMemorySessionStore(),
      sender,
    });

    handler({
      event_id: "evt_1",
      message: {
        chat_id: "oc_1",
        chat_type: "p2p",
        content: JSON.stringify({ text: "ping" }),
        create_time: "1",
        message_id: "om_1",
        message_type: "text",
      },
      sender: {
        sender_id: {
          open_id: "ou_1",
        },
        sender_type: "user",
      },
    }).then(() => {
      resolved = true;
    });

    await Promise.resolve();

    expect(resolved).toBe(true);
    expect(sender.addReaction).toHaveBeenCalledWith({
      emojiType: "OK",
      messageId: "om_1",
    });
    expect(sender.sendText).not.toHaveBeenCalled();
  });

  it("falls back to a text acknowledgement when the reaction call fails", async () => {
    const sender = {
      addReaction: vi.fn().mockRejectedValue(new Error("reaction failed")),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_ack_2" }),
      updateText: vi.fn(),
    };
    const handler = createMessageHandler({
      allowedOpenIds: ["ou_1"],
      maxInputChars: 1000,
      orchestrator: {
        handleRequest: vi.fn().mockResolvedValue(undefined),
      },
      sessionStore: createInMemorySessionStore(),
      sender,
    });

    await handler({
      event_id: "evt_fallback",
      message: {
        chat_id: "oc_1",
        chat_type: "p2p",
        content: JSON.stringify({ text: "ping" }),
        create_time: "1",
        message_id: "om_1",
        message_type: "text",
      },
      sender: {
        sender_id: {
          open_id: "ou_1",
        },
        sender_type: "user",
      },
    });

    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "👌 已收到，开始处理",
      }),
    );
  });

  it("replies with the allowlist rejection payload when sender is blocked", async () => {
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_reject_1" }),
      updateText: vi.fn(),
    };
    const handler = createMessageHandler({
      allowedOpenIds: ["ou_1"],
      maxInputChars: 1000,
      orchestrator: {
        handleRequest: vi.fn(),
      },
      sessionStore: createInMemorySessionStore(),
      sender,
    });

    await handler({
      event_id: "evt_2",
      message: {
        chat_id: "oc_2",
        chat_type: "p2p",
        content: JSON.stringify({ text: "ping" }),
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

    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_2",
        text: "Request rejected: sender_not_allowed. open_id=ou_2",
      }),
    );
  });

  it("handles bridge-native commands without calling the orchestrator", async () => {
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_command_1" }),
      updateText: vi.fn(),
    };
    const orchestrator = {
      handleRequest: vi.fn(),
    };
    const sessionStore = createInMemorySessionStore();
    sessionStore.setSessionId("oc_1", "thread_1");
    const handler = createMessageHandler({
      allowedOpenIds: ["ou_1"],
      maxInputChars: 1000,
      orchestrator,
      sessionStore,
      sender,
    });

    await handler({
      event_id: "evt_3",
      message: {
        chat_id: "oc_1",
        chat_type: "p2p",
        content: JSON.stringify({ text: "/reset" }),
        create_time: "1",
        message_id: "om_3",
        message_type: "text",
      },
      sender: {
        sender_id: {
          open_id: "ou_1",
        },
        sender_type: "user",
      },
    });

    expect(orchestrator.handleRequest).not.toHaveBeenCalled();
    expect(sessionStore.getSessionId("oc_1")).toBeUndefined();
    expect(sender.addReaction).not.toHaveBeenCalled();
    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: expect.stringContaining("new Codex session"),
      }),
    );
    expect(sender.sendText).toHaveBeenCalledTimes(1);
  });
});
