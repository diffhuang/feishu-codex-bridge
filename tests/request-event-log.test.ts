import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRequestEventLogWriter,
  resolveRequestEventLogFilePath,
} from "../src/logging/request-event-log";

describe("resolveRequestEventLogFilePath", () => {
  it("uses a per-request jsonl filename under logs/requests", () => {
    expect(
      resolveRequestEventLogFilePath("/tmp/bridge-logs", "req_123"),
    ).toBe("/tmp/bridge-logs/requests/req_123.codex-events.jsonl");
  });
});

describe("createRequestEventLogWriter", () => {
  it("appends raw Codex event lines into a per-request log", () => {
    const logDir = mkdtempSync(join(tmpdir(), "bridge-request-logs-"));
    const writer = createRequestEventLogWriter({ logDir });

    writer("req_123", "{\"type\":\"thread.started\"}");
    writer("req_123", "{\"type\":\"item.started\"}");

    expect(
      readFileSync(join(logDir, "requests", "req_123.codex-events.jsonl"), "utf8"),
    ).toBe(
      [
        "{\"type\":\"thread.started\"}",
        "{\"type\":\"item.started\"}",
        "",
      ].join("\n"),
    );
  });
});
