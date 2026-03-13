import { describe, expect, it } from "vitest";
import {
  executeBridgeCommand,
  parseBridgeCommand,
} from "../src/bridge/command-router";
import { createInMemorySessionStore } from "../src/bridge/session-store";

describe("parseBridgeCommand", () => {
  it("recognizes the reset command", () => {
    expect(parseBridgeCommand("/reset")).toEqual({ name: "reset" });
  });

  it("ignores non-command text", () => {
    expect(parseBridgeCommand("read the README")).toBeUndefined();
  });
});

describe("executeBridgeCommand", () => {
  it("clears the saved session for reset", () => {
    const sessionStore = createInMemorySessionStore();
    sessionStore.setSessionId("oc_1", "thread_1");

    const text = executeBridgeCommand(
      { name: "reset" },
      {
        chatId: "oc_1",
        sessionStore,
      },
    );

    expect(sessionStore.getSessionId("oc_1")).toBeUndefined();
    expect(text).toContain("new Codex session");
  });

  it("reports the saved session in status output", () => {
    const sessionStore = createInMemorySessionStore();
    sessionStore.setSessionId("oc_1", "thread_1");
    sessionStore.start("oc_1", "req_1");
    sessionStore.finish("oc_1", "req_1", "done");

    const text = executeBridgeCommand(
      { name: "status" },
      {
        chatId: "oc_1",
        sessionStore,
      },
    );

    expect(text).toContain("thread_1");
    expect(text).toContain("done");
  });
});
