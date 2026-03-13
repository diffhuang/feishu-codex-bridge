import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "../src/bridge/orchestrator";

describe("createOrchestrator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a second request while one task is active", async () => {
    const runner = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              attachments: [],
              exitCode: 0,
              ok: true,
              reply: "done",
              sessionId: "thread_1",
              stderr: "",
              stdout: "",
              timedOut: false,
            });
          }, 20);
        }),
    );
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_busy_1" }),
      updateText: vi.fn(),
    };
    const orchestrator = createOrchestrator({
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    const first = orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m1",
      requestId: "1",
      senderOpenId: "ou_1",
      text: "a",
    });
    const second = orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m2",
      requestId: "2",
      senderOpenId: "ou_1",
      text: "b",
    });

    await first;
    await second;

    expect(runner).toHaveBeenCalledTimes(1);
    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: expect.stringContaining("already running"),
      }),
    );
    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "done",
      }),
    );
  });

  it("sends one delayed processing hint for a long-running task", async () => {
    vi.useFakeTimers();

    let complete:
      | ((value: {
        attachments: [];
        exitCode: number;
        ok: boolean;
        reply: string;
        sessionId: string;
        stderr: string;
        stdout: string;
        timedOut: boolean;
      }) => void)
      | undefined;
    const runner = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const sender = {
      addReaction: vi.fn(),
      sendText: vi
        .fn()
        .mockResolvedValueOnce({ messageId: "om_progress_1" })
        .mockResolvedValueOnce({ messageId: "om_final_1" }),
      updateText: vi.fn().mockResolvedValue(undefined),
    };
    const orchestrator = createOrchestrator({
      progressReminderDelayMs: 30000,
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    const pending = orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m3",
      requestId: "3",
      senderOpenId: "ou_1",
      text: "long task",
    });

    await vi.advanceTimersByTimeAsync(30000);

    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "⏳ 还在处理中，我完成后会继续回复你",
      }),
    );

    await vi.advanceTimersByTimeAsync(60000);
    expect(
      sender.sendText.mock.calls.filter(
        ([payload]) =>
          payload
          && typeof payload === "object"
          && "text" in payload
          && payload.text === "⏳ 还在处理中，我完成后会继续回复你",
      ),
    ).toHaveLength(1);

    complete?.({
      attachments: [],
      exitCode: 0,
      ok: true,
      reply: "done",
      sessionId: "thread_1",
      stderr: "",
      stdout: "",
      timedOut: false,
    });
    await pending;

    expect(sender.updateText).toHaveBeenCalledWith({
      messageId: "om_progress_1",
      text: "done",
    });
    expect(sender.sendText).toHaveBeenCalledTimes(1);
  });

  it("does not send the delayed processing hint for a fast task", async () => {
    vi.useFakeTimers();

    const runner = vi.fn().mockResolvedValue({
      attachments: [],
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
      sendText: vi.fn().mockResolvedValue({ messageId: "om_final_2" }),
      updateText: vi.fn(),
    };
    const orchestrator = createOrchestrator({
      progressReminderDelayMs: 30000,
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m4",
      requestId: "4",
      senderOpenId: "ou_1",
      text: "fast task",
    });

    await vi.advanceTimersByTimeAsync(30000);

    expect(sender.sendText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "⏳ 还在处理中，我完成后会继续回复你",
      }),
    );
    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "done",
      }),
    );
    expect(sender.updateText).not.toHaveBeenCalled();
  });

  it("falls back to a fresh final message when updating the progress hint fails", async () => {
    vi.useFakeTimers();

    let complete:
      | ((value: {
        attachments: [];
        exitCode: number;
        ok: boolean;
        reply: string;
        sessionId: string;
        stderr: string;
        stdout: string;
        timedOut: boolean;
      }) => void)
      | undefined;
    const runner = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const sender = {
      addReaction: vi.fn(),
      sendText: vi
        .fn()
        .mockResolvedValueOnce({ messageId: "om_progress_2" })
        .mockResolvedValueOnce({ messageId: "om_final_3" }),
      updateText: vi.fn().mockRejectedValue(new Error("update failed")),
    };
    const orchestrator = createOrchestrator({
      progressReminderDelayMs: 30000,
      runner,
      sender,
      workspaceRoot: "/tmp/workspace",
    });

    const pending = orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m5",
      requestId: "5",
      senderOpenId: "ou_1",
      text: "long task",
    });

    await vi.advanceTimersByTimeAsync(30000);

    complete?.({
      attachments: [],
      exitCode: 0,
      ok: true,
      reply: "done",
      sessionId: "thread_1",
      stderr: "",
      stdout: "",
      timedOut: false,
    });
    await pending;

    expect(sender.updateText).toHaveBeenCalledWith({
      messageId: "om_progress_2",
      text: "done",
    });
    expect(sender.sendText).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        chatId: "oc_1",
        text: "done",
      }),
    );
  });

  it("streams verbose process events through the coordinator and skips the old delayed heartbeat", async () => {
    vi.useFakeTimers();

    const handleDecisionText = vi.fn().mockResolvedValue(undefined);
    const handleExecutionLine = vi.fn().mockResolvedValue(undefined);
    const flush = vi.fn().mockResolvedValue(undefined);
    const eventLogWriter = vi.fn();
    const coordinator = {
      flush,
      handleDecisionText,
      handleExecutionLine,
    };
    const createProcessStreamCoordinator = vi.fn().mockReturnValue(coordinator);
    const runner = vi.fn().mockImplementation(async (input) => {
      input.onEventLine?.("{\"type\":\"thread.started\"}");
      input.onEventLine?.(
        JSON.stringify({
          item: {
            command: "/bin/zsh -lc \"sed -n '1,220p' /tmp/skills/using-superpowers/SKILL.md\"",
            id: "item_1",
            status: "in_progress",
            type: "command_execution",
          },
          type: "item.started",
        }),
      );
      input.onEventLine?.(
        JSON.stringify({
          item: {
            id: "item_2",
            text: "done",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      );

      return {
        attachments: [],
        exitCode: 0,
        ok: true,
        reply: "done",
        sessionId: "thread_1",
        stderr: "",
        stdout: "",
        timedOut: false,
      };
    });
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_final_4" }),
      updateText: vi.fn(),
    };
    const orchestrator = createOrchestrator({
      createProcessStreamCoordinator,
      eventLogWriter,
      executionTailLines: 5,
      progressReminderDelayMs: 30000,
      runner,
      sender,
      verboseEvents: true,
      workspaceRoot: "/tmp/workspace",
    });

    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m6",
      requestId: "6",
      senderOpenId: "ou_1",
      text: "long task",
    });

    await vi.advanceTimersByTimeAsync(30000);

    expect(createProcessStreamCoordinator).toHaveBeenCalledWith({
      chatId: "oc_1",
      requestId: "6",
      sender,
      tailLines: 5,
    });
    expect(eventLogWriter).toHaveBeenNthCalledWith(1, "6", "{\"type\":\"thread.started\"}");
    expect(handleExecutionLine).not.toHaveBeenCalled();
    expect(handleDecisionText).toHaveBeenCalledWith("done");
    expect(flush).toHaveBeenCalled();
    expect(sender.sendText).not.toHaveBeenCalledWith(
      expect.objectContaining({
        text: "⏳ 还在处理中，我完成后会继续回复你",
      }),
    );
    expect(sender.sendText).not.toHaveBeenCalled();
  });

  it("does not push decision messages that contain the Feishu attachment block", async () => {
    const handleDecisionText = vi.fn().mockResolvedValue(undefined);
    const handleExecutionLine = vi.fn().mockResolvedValue(undefined);
    const flush = vi.fn().mockResolvedValue(undefined);
    const coordinator = {
      flush,
      handleDecisionText,
      handleExecutionLine,
    };
    const createProcessStreamCoordinator = vi.fn().mockReturnValue(coordinator);
    const runner = vi.fn().mockImplementation(async (input) => {
      input.onEventLine?.(
        JSON.stringify({
          item: {
            id: "item_2",
            text: [
              "已补：新增独立需求规划文档，并在总台账里补了对应引用。",
              "",
              "<FEISHU_ATTACHMENTS>",
              "{\"attachments\":[{\"path\":\"docs/report.md\"}]}",
              "</FEISHU_ATTACHMENTS>",
            ].join("\n"),
            type: "agent_message",
          },
          type: "item.completed",
        }),
      );

      return {
        attachments: [{ path: "docs/report.md", type: "file" }],
        exitCode: 0,
        ok: true,
        reply: "已补：新增独立需求规划文档，并在总台账里补了对应引用。",
        sessionId: "thread_1",
        stderr: "",
        stdout: "",
        timedOut: false,
      };
    });
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_final_5" }),
      updateText: vi.fn(),
    };
    const fileSender = vi.fn().mockResolvedValue(undefined);
    const resolveAttachment = vi.fn().mockReturnValue({
      absolutePath: "/tmp/workspace/docs/report.md",
      fileName: "report.md",
      fileType: "stream",
      relativePath: "docs/report.md",
      sizeBytes: 10,
    });
    const orchestrator = createOrchestrator({
      createProcessStreamCoordinator,
      fileSender,
      resolveAttachment,
      runner,
      sender,
      verboseEvents: true,
      workspaceRoot: "/tmp/workspace",
    });

    await orchestrator.handleRequest({
      chatId: "oc_1",
      feishuMessageId: "m7",
      requestId: "7",
      senderOpenId: "ou_1",
      text: "send the report",
    });

    expect(handleDecisionText).not.toHaveBeenCalled();
    expect(sender.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        text: "已补：新增独立需求规划文档，并在总台账里补了对应引用。",
      }),
    );
    expect(fileSender).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: "oc_1",
        requestId: "7",
      }),
    );
  });
});
