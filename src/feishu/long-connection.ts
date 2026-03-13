import * as Lark from "@larksuiteoapi/node-sdk";
import type { BridgeLogger } from "../logging/timestamp-logger.js";
import type { FeishuLongConnectionMessageEvent } from "../types.js";

type LongConnectionInput = {
  appId: string;
  appSecret: string;
  logger?: BridgeLogger;
  logLevel: string;
  onMessage: (event: FeishuLongConnectionMessageEvent) => Promise<void> | void;
};

function toLoggerLevel(logLevel: string): Lark.LoggerLevel {
  switch (logLevel) {
    case "fatal":
      return Lark.LoggerLevel.fatal;
    case "error":
      return Lark.LoggerLevel.error;
    case "warn":
      return Lark.LoggerLevel.warn;
    case "debug":
      return Lark.LoggerLevel.debug;
    case "trace":
      return Lark.LoggerLevel.trace;
    case "info":
    default:
      return Lark.LoggerLevel.info;
  }
}

export function createFeishuClient(
  input: Pick<LongConnectionInput, "appId" | "appSecret" | "logLevel" | "logger">,
) {
  return new Lark.Client({
    appId: input.appId,
    appSecret: input.appSecret,
    logger: input.logger,
    loggerLevel: toLoggerLevel(input.logLevel),
  });
}

export function createLongConnectionClient(input: LongConnectionInput) {
  const loggerLevel = toLoggerLevel(input.logLevel);
  const wsClient = new Lark.WSClient({
    appId: input.appId,
    appSecret: input.appSecret,
    logger: input.logger,
    loggerLevel,
  });
  const eventDispatcher = new Lark.EventDispatcher({
    logger: input.logger,
    loggerLevel,
  }).register({
    "im.message.receive_v1": async (data) => {
      await input.onMessage(data as FeishuLongConnectionMessageEvent);
    },
  });

  return {
    eventDispatcher,
    start: async () => {
      await wsClient.start({ eventDispatcher });
    },
    wsClient,
  };
}
