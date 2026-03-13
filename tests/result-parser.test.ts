import { describe, expect, it } from "vitest";
import {
  extractAgentMessageFromJsonl,
  extractThreadIdFromJsonl,
  parseCodexResultPayload,
} from "../src/codex/result-parser";

describe("parseCodexResultPayload", () => {
  it("parses reply text and file attachments from JSON output", () => {
    const result = parseCodexResultPayload(
      JSON.stringify({
        reply: "done",
        attachments: [{ type: "file", path: "README.md" }],
      }),
    );

    expect(result.reply).toBe("done");
    expect(result.attachments).toEqual([
      { path: "README.md", type: "file" },
    ]);
  });
});

describe("extractThreadIdFromJsonl", () => {
  it("returns the thread id from codex jsonl output", () => {
    expect(
      extractThreadIdFromJsonl(
        [
          JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
          JSON.stringify({ type: "message.completed" }),
        ].join("\n"),
      ),
    ).toBe("thread_1");
  });
});

describe("extractAgentMessageFromJsonl", () => {
  it("returns the latest agent message text from jsonl output", () => {
    expect(
      extractAgentMessageFromJsonl(
        [
          JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
          JSON.stringify({
            item: {
              id: "item_1",
              text: "{\"reply\":\"ok\"}",
              type: "agent_message",
            },
            type: "item.completed",
          }),
          JSON.stringify({ type: "turn.completed" }),
        ].join("\n"),
      ),
    ).toBe("{\"reply\":\"ok\"}");
  });
});
