import { classifyCodexEvent } from "../codex/event-classifier";
import { parseAttachmentBlock } from "../codex/attachment-block";
import { parseCodexEventLine } from "../codex/event-parser";
import { buildCodexPrompt } from "../codex/prompt-builder";
import type { CodexResponseMode } from "../codex/response-mode";
import { selectCodexResponseMode } from "../codex/response-mode";
import type { CodexRunResult } from "../codex/runner";
import { resolveAllowedAttachment, type ValidatedAttachment } from "../files/file-policy";
import type { MessageSender } from "../feishu/message-sender";
import {
  createProcessStreamCoordinator,
  type ProcessStreamCoordinator,
} from "./process-stream-coordinator";
import { createInMemorySessionStore, type SessionStore } from "./session-store";

export type OrchestratorRequest = {
  chatId: string;
  chatType?: string;
  feishuMessageId: string;
  messageType?: string;
  requestId: string;
  senderOpenId: string;
  text: string;
};

export type SenderPayload = {
  chatId: string;
  requestId: string;
  text: string;
};

export type FileSenderPayload = {
  attachment: ValidatedAttachment;
  chatId: string;
  requestId: string;
};

type OrchestratorDependencies = {
  command?: string;
  createProcessStreamCoordinator?: (input: {
    chatId: string;
    requestId: string;
    sender: MessageSender;
    tailLines: number;
  }) => ProcessStreamCoordinator;
  eventLogWriter?: (requestId: string, line: string) => void;
  executionTailLines?: number;
  fileSender?: (payload: FileSenderPayload) => Promise<void> | void;
  resolveAttachment?: (workspaceRoot: string, attachmentPath: string) => ValidatedAttachment;
  runner: (input: {
    command: string;
    onEventLine?: (line: string) => void;
    prompt: string;
    responseMode: CodexResponseMode;
    sandboxMode: "read-only" | "workspace-write" | "danger-full-access";
    sessionId?: string;
    timeoutMs: number;
    workspaceRoot: string;
  }) => Promise<CodexRunResult>;
  sandboxMode?: "read-only" | "workspace-write" | "danger-full-access";
  sessionStore?: SessionStore;
  sender: MessageSender;
  progressReminderDelayMs?: number;
  timeoutMs?: number;
  verboseEvents?: boolean;
  workspaceRoot: string;
};

const TASK_PROGRESS_REMINDER_DELAY_MS = 30000;
const TASK_PROGRESS_REMINDER_TEXT = "⏳ 还在处理中，我完成后会继续回复你";

export function createOrchestrator(dependencies: OrchestratorDependencies) {
  const sessionStore = dependencies.sessionStore ?? createInMemorySessionStore();
  const command = dependencies.command ?? "codex";
  const fileSender = dependencies.fileSender ?? (async () => undefined);
  const resolveAttachment = dependencies.resolveAttachment ?? resolveAllowedAttachment;
  const sandboxMode = dependencies.sandboxMode ?? "workspace-write";
  const progressReminderDelayMs =
    dependencies.progressReminderDelayMs ?? TASK_PROGRESS_REMINDER_DELAY_MS;
  const timeoutMs = dependencies.timeoutMs ?? 600000;
  const verboseEvents = dependencies.verboseEvents ?? false;
  const executionTailLines = dependencies.executionTailLines ?? 20;
  const processStreamCoordinatorFactory =
    dependencies.createProcessStreamCoordinator ?? createProcessStreamCoordinator;

  return {
    async handleRequest(request: OrchestratorRequest): Promise<void> {
      let lastDecisionText: string | undefined;
      let progressMessagePromise: Promise<string | undefined> | undefined;
      const processStreamCoordinator = verboseEvents
        ? processStreamCoordinatorFactory({
          chatId: request.chatId,
          requestId: request.requestId,
          sender: dependencies.sender,
          tailLines: executionTailLines,
        })
        : undefined;

      const sendText = (payload: SenderPayload) => dependencies.sender.sendText(payload);
      const deliverFinalText = async (text: string) => {
        if (lastDecisionText && areEquivalentMessages(lastDecisionText, text)) {
          return;
        }

        const progressMessageId = progressMessagePromise
          ? await progressMessagePromise
          : undefined;

        if (progressMessageId) {
          try {
            await dependencies.sender.updateText({
              messageId: progressMessageId,
              text,
            });
            return;
          } catch {
            // Fall back to a fresh message when the heartbeat cannot be updated.
          }
        }

        await sendText({
          chatId: request.chatId,
          requestId: request.requestId,
          text,
        });
      };

      if (sessionStore.hasSeen(request.feishuMessageId)) {
        return;
      }

      sessionStore.markSeen(request.feishuMessageId);

      if (sessionStore.isBusy()) {
        await sendText({
          chatId: request.chatId,
          requestId: request.requestId,
          text: "Another Codex task is already running. Please wait for it to finish.",
        });
        sessionStore.finish(request.chatId, request.requestId, "failed");
        return;
      }

      sessionStore.start(request.chatId, request.requestId);
      const progressReminder = !verboseEvents
        ? setTimeout(() => {
          progressMessagePromise = Promise.resolve(
            sendText({
              chatId: request.chatId,
              requestId: request.requestId,
              text: TASK_PROGRESS_REMINDER_TEXT,
            }),
          )
            .then((result) => result.messageId)
            .catch(() => undefined);
        }, progressReminderDelayMs)
        : undefined;

      try {
        const responseMode = selectCodexResponseMode(request.text);
        const prompt = buildCodexPrompt({
          responseMode,
          text: request.text,
          workspaceRoot: dependencies.workspaceRoot,
        });
        const result = await dependencies.runner({
          command,
          onEventLine: verboseEvents
            ? (line) => {
              dependencies.eventLogWriter?.(request.requestId, line);
              const parsedEvent = parseCodexEventLine(line);
              if (!parsedEvent || !processStreamCoordinator) {
                return;
              }

              const decision = classifyCodexEvent(parsedEvent);
              if (decision.channel === "decision") {
                if (decision.text.includes("<FEISHU_ATTACHMENTS>")) {
                  return;
                }

                const parsedDecision = parseAttachmentBlock(decision.text);
                if (parsedDecision.attachments.length > 0) {
                  return;
                }

                lastDecisionText = decision.text;
                void processStreamCoordinator.handleDecisionText(decision.text);
                return;
              }

              if (decision.channel === "execution") {
                void processStreamCoordinator.handleExecutionLine(decision.text);
              }
            }
            : undefined,
          prompt,
          responseMode,
          sandboxMode,
          sessionId: sessionStore.getSessionId(request.chatId),
          timeoutMs,
          workspaceRoot: dependencies.workspaceRoot,
        });

        if (result.timedOut) {
          await deliverFinalText(`Request ${request.requestId} timed out before Codex finished.`);
          sessionStore.finish(request.chatId, request.requestId, "failed");
          return;
        }

        if (!result.ok) {
          const errorText = result.stderr || `Codex exited with code ${result.exitCode ?? "unknown"}.`;
          await deliverFinalText(errorText);
          sessionStore.finish(request.chatId, request.requestId, "failed");
          return;
        }

        if (result.sessionId) {
          sessionStore.setSessionId(request.chatId, result.sessionId);
        }

        await processStreamCoordinator?.flush();
        await deliverFinalText(result.reply || result.stdout || "Codex completed without output.");

        for (const attachment of result.attachments) {
          const validatedAttachment = resolveAttachment(
            dependencies.workspaceRoot,
            attachment.path,
          );
          await fileSender({
            attachment: validatedAttachment,
            chatId: request.chatId,
            requestId: request.requestId,
          });
        }

        sessionStore.finish(request.chatId, request.requestId, "done");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Codex execution error.";
        await processStreamCoordinator?.flush();
        await deliverFinalText(message);
        sessionStore.finish(request.chatId, request.requestId, "failed");
      } finally {
        if (progressReminder) {
          clearTimeout(progressReminder);
        }
      }
    },
  };
}

function areEquivalentMessages(left: string, right: string): boolean {
  return left.trim() === right.trim();
}
