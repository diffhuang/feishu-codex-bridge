import type { ParsedCodexEvent } from "./event-parser.js";

export type CodexEventRoutingDecision =
  | {
    channel: "decision";
    text: string;
  }
  | {
    channel: "execution";
    text: string;
  }
  | {
    channel: "ignore";
  };

const IGNORED_EVENT_TYPES = new Set([
  "thread.started",
  "thread.completed",
  "turn.started",
  "turn.completed",
]);

export function classifyCodexEvent(event: ParsedCodexEvent): CodexEventRoutingDecision {
  const eventText = event.text?.trim();

  if (IGNORED_EVENT_TYPES.has(event.type)) {
    return {
      channel: "ignore",
    };
  }

  if (event.itemType === "agent_message") {
    if (!eventText) {
      return {
        channel: "ignore",
      };
    }

    return {
      channel: "decision",
      text: eventText,
    };
  }

  if (event.itemType === "command_execution") {
    return {
      channel: "ignore",
    };
  }

  return {
    channel: "ignore",
  };
}
