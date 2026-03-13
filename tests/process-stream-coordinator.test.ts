import { describe, expect, it, vi } from "vitest";
import { createProcessStreamCoordinator } from "../src/bridge/process-stream-coordinator";

describe("createProcessStreamCoordinator", () => {
  it("creates one rolling execution message and updates it for later execution events", async () => {
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_exec_1" }),
      updateText: vi.fn().mockResolvedValue(undefined),
    };
    const coordinator = createProcessStreamCoordinator({
      chatId: "oc_1",
      requestId: "req_1",
      sender,
      tailLines: 2,
    });

    await coordinator.handleExecutionLine("{\"type\":\"thread.started\"}");
    await coordinator.handleExecutionLine("{\"type\":\"item.started\"}");
    await coordinator.handleExecutionLine("{\"type\":\"item.completed\"}");

    expect(sender.sendText).toHaveBeenCalledWith({
      chatId: "oc_1",
      requestId: "req_1",
      text: "{\"type\":\"thread.started\"}",
    });
    expect(sender.updateText).toHaveBeenLastCalledWith({
      messageId: "om_exec_1",
      text: [
        "{\"type\":\"item.started\"}",
        "{\"type\":\"item.completed\"}",
      ].join("\n"),
    });
  });

  it("sends decision text as standalone messages", async () => {
    const sender = {
      addReaction: vi.fn(),
      sendText: vi.fn().mockResolvedValue({ messageId: "om_decision_1" }),
      updateText: vi.fn(),
    };
    const coordinator = createProcessStreamCoordinator({
      chatId: "oc_1",
      requestId: "req_1",
      sender,
      tailLines: 20,
    });

    await coordinator.handleDecisionText("Should I continue?");

    expect(sender.sendText).toHaveBeenCalledWith({
      chatId: "oc_1",
      requestId: "req_1",
      text: "Should I continue?",
    });
    expect(sender.updateText).not.toHaveBeenCalled();
  });
});
