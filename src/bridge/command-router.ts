import type { SessionStore } from "./session-store";

export type BridgeCommand =
  | { name: "help" }
  | { name: "reset" }
  | { name: "status" };

const HELP_TEXT = [
  "Bridge commands:",
  "/help - show the supported bridge commands",
  "/status - show the saved Codex session for this chat",
  "/reset - start a new Codex session for this chat",
].join("\n");

export function parseBridgeCommand(text: string): BridgeCommand | undefined {
  const normalized = text.trim().split(/\s+/, 1)[0]?.toLowerCase();

  switch (normalized) {
    case "/help":
      return { name: "help" };
    case "/reset":
      return { name: "reset" };
    case "/status":
      return { name: "status" };
    default:
      return undefined;
  }
}

export function executeBridgeCommand(
  command: BridgeCommand,
  input: {
    chatId: string;
    sessionStore: SessionStore;
  },
): string {
  switch (command.name) {
    case "help":
      return HELP_TEXT;
    case "reset":
      if (input.sessionStore.isBusy()) {
        return "Cannot reset the saved Codex session while another task is running. Wait for it to finish first.";
      }

      input.sessionStore.clearSessionId(input.chatId);

      return "Reset complete. The next non-command message will start a new Codex session.";
    case "status":
      return buildStatusText(input.chatId, input.sessionStore);
  }
}

function buildStatusText(chatId: string, sessionStore: SessionStore): string {
  const chatState = sessionStore.getChatState(chatId);

  if (!chatState) {
    return "No saved Codex session for this chat. Send a normal message to start one.";
  }

  return [
    "Chat session status:",
    `session_id: ${chatState.sessionId ?? "none"}`,
    `last_request_id: ${chatState.lastRequestId ?? "none"}`,
    `last_status: ${chatState.lastStatus ?? "unknown"}`,
    `busy: ${sessionStore.isBusy() && sessionStore.getActiveChatId() === chatId ? "yes" : "no"}`,
  ].join("\n");
}
