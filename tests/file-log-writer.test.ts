import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createFileLogWriter,
  resolveDailyLogFilePath,
} from "../src/logging/file-log-writer";

describe("resolveDailyLogFilePath", () => {
  it("uses a daily bridge log filename", () => {
    const logPath = resolveDailyLogFilePath(
      "/tmp/bridge-logs",
      new Date(Date.UTC(2026, 2, 11, 1, 30, 12, 345)),
    );

    expect(logPath).toBe("/tmp/bridge-logs/bridge-2026-03-11.log");
  });
});

describe("createFileLogWriter", () => {
  it("appends multiple lines into the same daily log file", () => {
    const logDir = mkdtempSync(join(tmpdir(), "bridge-logs-"));
    const writer = createFileLogWriter({
      logDir,
      now: () => new Date(Date.UTC(2026, 2, 11, 1, 30, 12, 345)),
    });

    writer("info", "2026-03-11T09:30:12.345+08:00 [info] first");
    writer("warn", "2026-03-11T09:30:13.000+08:00 [warn] second");

    expect(
      readFileSync(join(logDir, "bridge-2026-03-11.log"), "utf8"),
    ).toBe(
      [
        "2026-03-11T09:30:12.345+08:00 [info] first",
        "2026-03-11T09:30:13.000+08:00 [warn] second",
        "",
      ].join("\n"),
    );
  });
});
