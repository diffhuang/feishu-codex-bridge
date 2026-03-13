import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createMessageHandler } from "./bridge/message-handler.js";
import { createOrchestrator } from "./bridge/orchestrator.js";
import { createInMemorySessionStore } from "./bridge/session-store.js";
import { runCodex } from "./codex/runner.js";
import { loadConfig } from "./config.js";
import { resolveAllowedAttachment } from "./files/file-policy.js";
import { createFileSender } from "./feishu/file-sender.js";
import { createLongConnectionClient, createFeishuClient } from "./feishu/long-connection.js";
import { combineLogWriters, createFileLogWriter } from "./logging/file-log-writer.js";
import { createRequestEventLogWriter } from "./logging/request-event-log.js";
import {
  createTimestampLogger,
  defaultConsoleLogWriter,
  toBridgeLogLevel,
} from "./logging/timestamp-logger.js";
import { createMessageSender } from "./feishu/message-sender.js";
import { resolveRuntimePaths, type RuntimePaths } from "./runtime/paths.js";

export const projectMetadata = {
  name: "feishu-codex-bridge",
};

export type { BridgeConfig } from "./config.js";
export { loadConfig } from "./config.js";

export type StartBridgeOptions = {
  runtimePaths?: RuntimePaths;
};

function createBridgeLogger(logDir: string, logLevel = "info") {
  return createTimestampLogger({
    level: toBridgeLogLevel(logLevel),
    write: combineLogWriters(
      defaultConsoleLogWriter,
      createFileLogWriter({ logDir }),
    ),
  });
}

export async function startBridge(
  env: NodeJS.ProcessEnv = process.env,
  options: StartBridgeOptions = {},
) {
  const config = loadConfig(env);
  const runtimePaths = options.runtimePaths ?? resolveRuntimePaths();
  const logDir = runtimePaths.logDir;
  const logger = createBridgeLogger(logDir, config.logLevel);
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
    createBridgeLogger(resolveRuntimePaths().logDir).error("[bridge] failed to start", error);
    process.exitCode = 1;
  });
}
