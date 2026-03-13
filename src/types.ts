export type FeishuMessageEvent = {
  header: {
    event_id: string;
  };
  event: {
    chat_id: string;
    message: {
      chat_type: string;
      content: string;
      message_id: string;
      message_type: string;
    };
    sender: {
      sender_id: {
        open_id: string;
      };
    };
  };
};

export type FeishuLongConnectionMessageEvent = {
  event_id?: string;
  message: {
    chat_id: string;
    chat_type: string;
    content: string;
    create_time: string;
    message_id: string;
    message_type: string;
  };
  sender: {
    sender_id?: {
      open_id?: string;
    };
    sender_type: string;
  };
};

export type NormalizedRequest = {
  chatId: string;
  chatType: string;
  feishuEventId: string;
  feishuMessageId: string;
  messageType: string;
  requestId: string;
  senderOpenId: string;
  text: string;
};

export type GuardInput = Pick<
  NormalizedRequest,
  "chatType" | "messageType" | "senderOpenId" | "text"
>;

export type GuardConfig = {
  allowedOpenIds: string[];
  maxInputChars: number;
};

export type GuardResult = {
  allowed: boolean;
  reason?: "input_too_long" | "sender_not_allowed" | "unsupported_chat_type" | "unsupported_message_type";
};
