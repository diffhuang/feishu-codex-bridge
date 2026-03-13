import { describe, expect, it } from "vitest";
import { parseCodexEventLine } from "../src/codex/event-parser";

describe("parseCodexEventLine", () => {
  it("parses an agent message event with text", () => {
    const line = JSON.stringify({
      item: {
        id: "item_1",
        text: "Need approval before proceeding.",
        type: "agent_message",
      },
      type: "item.completed",
    });

    expect(parseCodexEventLine(line)).toEqual({
      itemType: "agent_message",
      rawLine: line,
      text: "Need approval before proceeding.",
      type: "item.completed",
    });
  });

  it("parses a non-agent event without inventing text", () => {
    const line = JSON.stringify({
      item: {
        command: "sed -n '1,20p' README.md",
        exit_code: 0,
        id: "item_2",
        name: "shell",
        status: "completed",
        type: "tool_call",
      },
      type: "item.started",
    });

    expect(parseCodexEventLine(line)).toEqual({
      command: "sed -n '1,20p' README.md",
      exitCode: 0,
      itemType: "tool_call",
      rawLine: line,
      status: "completed",
      text: undefined,
      type: "item.started",
    });
  });

  it("ignores invalid or non-typed lines", () => {
    expect(parseCodexEventLine("not json")).toBeUndefined();
    expect(parseCodexEventLine(JSON.stringify({ foo: "bar" }))).toBeUndefined();
  });
});
