import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type RequestEventLogWriterOptions = {
  logDir: string;
};

export function resolveRequestEventLogFilePath(logDir: string, requestId: string) {
  return join(logDir, "requests", `${requestId}.codex-events.jsonl`);
}

export function createRequestEventLogWriter(options: RequestEventLogWriterOptions) {
  return (requestId: string, line: string) => {
    const filePath = resolveRequestEventLogFilePath(options.logDir, requestId);
    mkdirSync(join(options.logDir, "requests"), { recursive: true });
    appendFileSync(filePath, `${line}\n`, "utf8");
  };
}
