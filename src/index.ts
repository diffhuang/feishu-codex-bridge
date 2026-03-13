import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createMessageHandler } from "./bridge/message-handler";
import { createOrchestrator } from "./bridge/orchestrator";
import { createInMemorySessionStore } from "./bridge/session-store";
import { runCodex } from "./codex/runner";
import { loadConfig } from "./config";
import { resolveAllowedAttachment } from "./files/file-policy";
import { createFileSender } from "./feishu/file-sender";
import { createLongConnectionClient, createFeishuClient } from "./feishu/long-connection";
import { combineLogWriters, createFileLogWriter } from "./logging/file-log-writer";
import { createRequestEventLogWriter } from "./logging/request-event-log";
import {
  createTimestampLogger,
  defaultConsoleLogWriter,
  toBridgeLogLevel,
} from "./logging/timestamp-logger";
import { createMessageSender } from "./feishu/message-sender";

export const projectMetadata = {
  name: "feishu-codex-bridge",
};

export type { BridgeConfig } from "./config";
export { loadConfig } from "./config";

function createBridgeLogger(logLevel = "info") {
  const logDir = fileURLToPath(new URL("../logs/", import.meta.url));

  return createTimestampLogger({
    level: toBridgeLogLevel(logLevel),
    write: combineLogWriters(
      defaultConsoleLogWriter,
      createFileLogWriter({ logDir }),
    ),
  });
}

export async function startBridge(env: NodeJS.ProcessEnv = process.env) {
  const config = loadConfig(env);
  const logDir = fileURLToPath(new URL("../logs/", import.meta.url));
  const logger = createBridgeLogger(config.logLevel);
  const client = createFeishuClient({
    appId: config.appId,
    appSecret: config.appSecret,
    logLevel: config.logLevel,
    logger,
  });
  const sessionStore = createInMemorySessionStore();
  const sender = createMessageSender(client);
  const fileSender = createFileSender(client);
  const requestEventLogWriter = createRequestEventLogWriter({ logDir });
  const orchestrator = createOrchestrator({
    command: config.codexCommand,
    eventLogWriter: requestEventLogWriter,
    executionTailLines: config.executionTailLines,
    fileSender,
    resolveAttachment: (workspaceRoot, attachmentPath) =>
      resolveAllowedAttachment(workspaceRoot, attachmentPath),
    runner: runCodex,
    sandboxMode: config.sandboxMode,
    sessionStore,
    sender,
    timeoutMs: config.timeoutMs,
    verboseEvents: config.verboseEvents,
    workspaceRoot: config.workspaceRoot,
  });
  const onMessage = createMessageHandler({
    allowedOpenIds: config.allowedOpenIds,
    maxInputChars: config.replyMaxChars,
    orchestrator,
    sessionStore,
    sender,
  });
  const longConnection = createLongConnectionClient({
    appId: config.appId,
    appSecret: config.appSecret,
    logger,
    logLevel: config.logLevel,
    onMessage,
  });

  logger.info(
    "[bridge]",
    `starting long connection for workspace ${config.workspaceRoot}`,
  );
  await longConnection.start();

  return {
    client,
    wsClient: longConnection.wsClient,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  dotenv.config();
  startBridge().catch((error) => {
    createBridgeLogger().error("[bridge] failed to start", error);
    process.exitCode = 1;
  });
}
