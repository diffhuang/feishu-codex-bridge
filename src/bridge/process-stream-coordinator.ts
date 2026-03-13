import { createExecutionBuffer } from "../codex/execution-buffer";
import type { MessageSender } from "../feishu/message-sender";

type ProcessStreamCoordinatorOptions = {
  chatId: string;
  requestId: string;
  sender: MessageSender;
  tailLines: number;
};

export type ProcessStreamCoordinator = {
  flush: () => Promise<void>;
  handleDecisionText: (text: string) => Promise<void>;
  handleExecutionLine: (line: string) => Promise<void>;
};

export function createProcessStreamCoordinator(
  options: ProcessStreamCoordinatorOptions,
): ProcessStreamCoordinator {
  const buffer = createExecutionBuffer(options.tailLines);
  let executionMessageId: string | undefined;
  let pending = Promise.resolve();

  const enqueue = (work: () => Promise<void>) => {
    pending = pending
      .then(work)
      .catch(() => undefined);

    return pending;
  };

  return {
    flush() {
      return pending;
    },
    handleDecisionText(text: string) {
      return enqueue(async () => {
        await options.sender.sendText({
          chatId: options.chatId,
          requestId: options.requestId,
          text,
        });
      });
    },
    handleExecutionLine(line: string) {
      return enqueue(async () => {
        buffer.append(line);
        if (executionMessageId) {
          await options.sender.updateText({
            messageId: executionMessageId,
            text: buffer.snapshot(),
          });
          return;
        }

        const result = await options.sender.sendText({
          chatId: options.chatId,
          requestId: options.requestId,
          text: buffer.snapshot(),
        });
        executionMessageId = result.messageId;
      });
    },
  };
}
