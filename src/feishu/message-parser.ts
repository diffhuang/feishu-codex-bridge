import type {
  FeishuLongConnectionMessageEvent,
  FeishuMessageEvent,
  NormalizedRequest,
} from "../types";

function parseTextContent(rawContent: string): string {
  try {
    const parsed = JSON.parse(rawContent) as { text?: string };
    return parsed.text?.trim() ?? "";
  } catch {
    return rawContent.trim();
  }
}

export function parseMessageEvent(
  event: FeishuLongConnectionMessageEvent | FeishuMessageEvent,
): NormalizedRequest {
  const payload = "event" in event
    ? {
        chatId: event.event.chat_id,
        eventId: event.header.event_id,
        message: event.event.message,
        senderOpenId: event.event.sender.sender_id.open_id,
      }
    : {
        chatId: event.message.chat_id,
        eventId: event.event_id ?? event.message.message_id,
        message: event.message,
        senderOpenId: event.sender.sender_id?.open_id ?? "",
      };
  const text = parseTextContent(payload.message.content);

  return {
    chatId: payload.chatId,
    chatType: payload.message.chat_type,
    feishuEventId: payload.eventId,
    feishuMessageId: payload.message.message_id,
    messageType: payload.message.message_type,
    requestId: `${payload.eventId}:${payload.message.message_id}`,
    senderOpenId: payload.senderOpenId,
    text,
  };
}
