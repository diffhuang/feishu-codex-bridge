import { describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "../src/bridge/orchestrator";

describe("createOrchestrator attachments", () => {
  it("reuses the saved session id for the next request in the same chat", async () => {
    const runner = vi
      .fn()
      .mockResolvedValueOnce({
        attachments: [],
        exitCode: 0,
        ok: true,
        reply: "first",
        sessionId: "thread_1",
        stderr: "",
        stdout: "",
        timedOut: false,
      })
      .mockResolvedValueOnce({
        attachments: [],
        exitCode: 0,
        ok: true,
        reply: "second",
        sessionId: "thread_1",
        stderr: "",
        stdout: "",
        timedOut: false,
      });
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_reply_1" }),
      updateText: vi.fn(),
    };
    const fileSender = vi.fn().mockResolvedValue(undefined);
    const orchestrator = createOrchestrator({
      fileSender,
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m1",
      requestId: "1",
      senderOpenId: "ou_1",
      text: "first",
    });
    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m2",
      requestId: "2",
      senderOpenId: "ou_1",
      text: "second",
    });

    expect(runner.mock.calls[0]?.[0].sessionId).toBeUndefined();
    expect(runner.mock.calls[1]?.[0].sessionId).toBe("thread_1");
  });

  it("sends validated attachments after the text reply", async () => {
    const runner = vi.fn().mockResolvedValue({
      attachments: [{ path: "README.md", type: "file" }],
      exitCode: 0,
      ok: true,
      reply: "done",
      sessionId: "thread_1",
      stderr: "",
      stdout: "",
      timedOut: false,
    });
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_reply_2" }),
      updateText: vi.fn(),
    };
    const fileSender = vi.fn().mockResolvedValue(undefined);
    const resolveAttachment = vi.fn().mockReturnValue({
      absolutePath: "/tmp/workspace/README.md",
      fileName: "README.md",
      fileType: "stream",
      relativePath: "README.md",
      sizeBytes: 10,
    });
    const orchestrator = createOrchestrator({
      fileSender,
      resolveAttachment,
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m1",
      requestId: "1",
      senderOpenId: "ou_1",
      text: "send the readme",
    });

    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "done",
      }),
    );
    expect(resolveAttachment).toHaveBeenCalledWith(
      "/tmp/workspace",
      "README.md",
    );
    expect(fileSender).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        requestId: "1",
      }),
    );
  });
});
