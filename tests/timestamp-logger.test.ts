import { describe, expect, it } from "vitest";
import {
  createTimestampLogger,
  formatTimestamp,
} from "../src/logging/timestamp-logger";

describe("formatTimestamp", () => {
  it("formats timestamps with a numeric timezone offset", () => {
    const timestamp = formatTimestamp(
      new Date(Date.UTC(2026, 2, 11, 1, 30, 12, 345)),
      480,
    );

    expect(timestamp).toBe("2026-03-11T09:30:12.345+08:00");
  });
});

describe("createTimestampLogger", () => {
  it("renders SDK array logs into a single timestamped line", () => {
    const lines: string[] = [];
    const logger = createTimestampLogger({
      now: () => new Date(Date.UTC(2026, 2, 11, 1, 30, 12, 345)),
      offsetMinutes: 480,
      write: (_level, line) => {
        lines.push(line);
      },
    });

    logger.info(["[ws]", "reconnect"]);

    expect(lines).toEqual([
      "2026-03-11T09:30:12.345+08:00 [info] [ws] reconnect",
    ]);
  });

  it("formats bridge logs with the same timestamp prefix", () => {
    const lines: string[] = [];
    const logger = createTimestampLogger({
      now: () => new Date(Date.UTC(2026, 2, 11, 1, 30, 12, 345)),
      offsetMinutes: 480,
      write: (_level, line) => {
        lines.push(line);
      },
    });

    logger.error("[bridge] failed to start", new Error("boom"));

    expect(lines[0]).toContain(
      "2026-03-11T09:30:12.345+08:00 [error] [bridge] failed to start",
    );
    expect(lines[0]).toContain("Error: boom");
  });
});
