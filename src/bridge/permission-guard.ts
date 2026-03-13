import type { GuardConfig, GuardInput, GuardResult } from "../types";

export function evaluateRequest(
  request: GuardInput,
  config: GuardConfig,
): GuardResult {
  if (!config.allowedOpenIds.includes(request.senderOpenId)) {
    return {
      allowed: false,
      reason: "sender_not_allowed",
    };
  }

  if (request.chatType !== "p2p") {
    return {
      allowed: false,
      reason: "unsupported_chat_type",
    };
  }

  if (request.messageType !== "text") {
    return {
      allowed: false,
      reason: "unsupported_message_type",
    };
  }

  if (request.text.length > config.maxInputChars) {
    return {
      allowed: false,
      reason: "input_too_long",
    };
  }

  return {
    allowed: true,
  };
}
