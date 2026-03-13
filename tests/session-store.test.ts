import { describe, expect, it } from "vitest";
import { createInMemorySessionStore } from "../src/bridge/session-store";

describe("createInMemorySessionStore", () => {
  it("stores and clears a session id by chat id", () => {
    const store = createInMemorySessionStore();

    store.setSessionId("oc_1", "thread_1");
    expect(store.getSessionId("oc_1")).toBe("thread_1");

    store.clearSessionId("oc_1");
    expect(store.getSessionId("oc_1")).toBeUndefined();
  });

  it("tracks chat status changes for the latest request", () => {
    const store = createInMemorySessionStore();

    store.start("oc_1", "req_1");
    store.finish("oc_1", "req_1", "done");

    expect(store.getChatState("oc_1")).toMatchObject({
      lastRequestId: "req_1",
      lastStatus: "done",
    });
  });
});
