import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { BridgeLogLevel } from "./timestamp-logger.js";

type FileLogWriterOptions = {
  logDir: string;
  now?: () => Date;
};

type BridgeLogWriter = (level: BridgeLogLevel, line: string) => void;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export function resolveDailyLogFilePath(logDir: string, date: Date) {
  return join(
    logDir,
    `bridge-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.log`,
  );
}

export function createFileLogWriter(
  options: FileLogWriterOptions,
): BridgeLogWriter {
  const now = options.now ?? (() => new Date());

  return (_level, line) => {
    mkdirSync(options.logDir, { recursive: true });
    appendFileSync(resolveDailyLogFilePath(options.logDir, now()), `${line}\n`, "utf8");
  };
}

export function combineLogWriters(...writers: BridgeLogWriter[]): BridgeLogWriter {
  return (level, line) => {
    for (const writer of writers) {
      writer(level, line);
    }
  };
}
