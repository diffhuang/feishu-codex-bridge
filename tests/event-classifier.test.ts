import { describe, expect, it } from "vitest";
import { classifyCodexEvent } from "../src/codex/event-classifier";

describe("classifyCodexEvent", () => {
  it("routes agent messages to the decision stream", () => {
    expect(
      classifyCodexEvent({
        itemType: "agent_message",
        rawLine: "{\"type\":\"item.completed\"}",
        text: "Should I continue?",
        type: "item.completed",
      }),
    ).toEqual({
      channel: "decision",
      text: "Should I continue?",
    });
  });

  it("ignores command execution events so execution logs stay local", () => {
    expect(
      classifyCodexEvent({
        command: "/bin/zsh -lc \"sed -n '1,220p' /tmp/skills/using-superpowers/SKILL.md\"",
        itemType: "command_execution",
        rawLine:
          "{\"type\":\"item.started\",\"item\":{\"type\":\"command_execution\",\"command\":\"/bin/zsh -lc \\\"sed -n '1,220p' /tmp/skills/using-superpowers/SKILL.md\\\"\"}}",
        status: "in_progress",
        text: undefined,
        type: "item.started",
      }),
    ).toEqual({
      channel: "ignore",
    });
  });

  it("ignores empty agent messages", () => {
    expect(
      classifyCodexEvent({
        itemType: "agent_message",
        rawLine: "{\"type\":\"item.completed\"}",
        text: "   ",
        type: "item.completed",
      }),
    ).toEqual({
      channel: "ignore",
    });
  });

  it("ignores thread lifecycle events", () => {
    expect(
      classifyCodexEvent({
        rawLine: "{\"type\":\"thread.started\"}",
        type: "thread.started",
      }),
    ).toEqual({
      channel: "ignore",
    });
  });
});
