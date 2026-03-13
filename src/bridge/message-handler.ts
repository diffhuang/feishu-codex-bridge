import { executeBridgeCommand, parseBridgeCommand } from "./command-router.js";
import type { OrchestratorRequest, SenderPayload } from "./orchestrator.js";
import { evaluateRequest } from "./permission-guard.js";
import { buildGuardRejectionMessage } from "./rejection-message.js";
import type { SessionStore } from "./session-store.js";
import type { MessageSender } from "../feishu/message-sender.js";
import { parseMessageEvent } from "../feishu/message-parser.js";
import type { FeishuLongConnectionMessageEvent } from "../types.js";

type MessageHandlerDependencies = {
  allowedOpenIds: string[];
  maxInputChars: number;
  orchestrator: {
    handleRequest: (request: OrchestratorRequest) => Promise<void>;
  };
  sessionStore: SessionStore;
  sender: MessageSender;
};

const TASK_ACKNOWLEDGEMENT_TEXT = "👌 已收到，开始处理";
const TASK_ACKNOWLEDGEMENT_REACTION = "OK";

export function createMessageHandler(dependencies: MessageHandlerDependencies) {
  return async (event: FeishuLongConnectionMessageEvent): Promise<void> => {
    const request = parseMessageEvent(event);
    const guardResult = evaluateRequest(request, {
      allowedOpenIds: dependencies.allowedOpenIds,
      maxInputChars: dependencies.maxInputChars,
    });

    if (!guardResult.allowed) {
      await dependencies.sender.sendText({
        chatId: request.chatId,
        requestId: request.requestId,
        text: buildGuardRejectionMessage(guardResult.reason, request),
      });
      return;
    }

    const command = parseBridgeCommand(request.text);
    if (command) {
      await dependencies.sender.sendText({
        chatId: request.chatId,
        requestId: request.requestId,
        text: executeBridgeCommand(command, {
          chatId: request.chatId,
          sessionStore: dependencies.sessionStore,
        }),
      });
      return;
    }

    void Promise.resolve(
      dependencies.sender.addReaction({
        emojiType: TASK_ACKNOWLEDGEMENT_REACTION,
        messageId: request.feishuMessageId,
      }),
    ).catch(() =>
      Promise.resolve(
        dependencies.sender.sendText({
          chatId: request.chatId,
          requestId: request.requestId,
          text: TASK_ACKNOWLEDGEMENT_TEXT,
        }),
      ).then(() => undefined),
    );

    void dependencies.orchestrator.handleRequest(request).catch(async (error) => {
      const message = error instanceof Error ? error.message : "Unknown bridge execution error.";
      await dependencies.sender.sendText({
        chatId: request.chatId,
        requestId: request.requestId,
        text: message,
      });
    });
  };
}
