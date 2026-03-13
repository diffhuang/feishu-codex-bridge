import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("parses required environment values", () => {
    const config = loadConfig({
      FEISHU_APP_ID: "cli_xxx",
      FEISHU_APP_SECRET: "secret",
      CODEX_WORKSPACE_ROOT: "/tmp/workspace",
      ALLOWED_OPEN_IDS: "ou_1,ou_2",
    });

    expect(config.allowedOpenIds).toEqual(["ou_1", "ou_2"]);
    expect("attachmentAllowedPrefixes" in config).toBe(false);
    expect(config.executionTailLines).toBe(20);
    expect(config.sandboxMode).toBe("workspace-write");
    expect(config.verboseEvents).toBe(false);
    expect(config.workspaceRoot).toBe("/tmp/workspace");
  });

  it("rejects non-ascii workspace roots with a clear error", () => {
    expect(() =>
      loadConfig({
        FEISHU_APP_ID: "cli_xxx",
        FEISHU_APP_SECRET: "secret",
        CODEX_WORKSPACE_ROOT: "/Users/name/Desktop/AI开发/codex",
        ALLOWED_OPEN_IDS: "ou_1",
      }),
    ).toThrow(/real ASCII-only directory/);
  });

  it("ignores legacy attachment prefix environment values", () => {
    const config = loadConfig({
      ATTACHMENT_ALLOWED_PREFIXES: "project/,docs/",
      FEISHU_APP_ID: "cli_xxx",
      FEISHU_APP_SECRET: "secret",
      CODEX_WORKSPACE_ROOT: "/tmp/workspace",
      ALLOWED_OPEN_IDS: "ou_1",
    });

    expect("attachmentAllowedPrefixes" in config).toBe(false);
    expect(config.workspaceRoot).toBe("/tmp/workspace");
  });

  it("parses an explicit sandbox mode", () => {
    const config = loadConfig({
      CODEX_SANDBOX_MODE: "read-only",
      FEISHU_APP_ID: "cli_xxx",
      FEISHU_APP_SECRET: "secret",
      CODEX_WORKSPACE_ROOT: "/tmp/workspace",
      ALLOWED_OPEN_IDS: "ou_1",
    });

    expect(config.sandboxMode).toBe("read-only");
  });

  it("parses verbose process streaming settings", () => {
    const config = loadConfig({
      CODEX_EXECUTION_TAIL_LINES: "12",
      CODEX_VERBOSE_EVENTS: "true",
      FEISHU_APP_ID: "cli_xxx",
      FEISHU_APP_SECRET: "secret",
      CODEX_WORKSPACE_ROOT: "/tmp/workspace",
      ALLOWED_OPEN_IDS: "ou_1",
    });

    expect(config.executionTailLines).toBe(12);
    expect(config.verboseEvents).toBe(true);
  });

  it("rejects unsupported verbose event flags", () => {
    expect(() =>
      loadConfig({
        CODEX_VERBOSE_EVENTS: "maybe",
        FEISHU_APP_ID: "cli_xxx",
        FEISHU_APP_SECRET: "secret",
        CODEX_WORKSPACE_ROOT: "/tmp/workspace",
        ALLOWED_OPEN_IDS: "ou_1",
      }),
    ).toThrow(/CODEX_VERBOSE_EVENTS/);
  });

  it("rejects invalid execution tail window values", () => {
    expect(() =>
      loadConfig({
        CODEX_EXECUTION_TAIL_LINES: "0",
        FEISHU_APP_ID: "cli_xxx",
        FEISHU_APP_SECRET: "secret",
        CODEX_WORKSPACE_ROOT: "/tmp/workspace",
        ALLOWED_OPEN_IDS: "ou_1",
      }),
    ).toThrow(/CODEX_EXECUTION_TAIL_LINES/);
  });

  it("rejects unsupported sandbox modes", () => {
    expect(() =>
      loadConfig({
        CODEX_SANDBOX_MODE: "invalid-mode",
        FEISHU_APP_ID: "cli_xxx",
        FEISHU_APP_SECRET: "secret",
        CODEX_WORKSPACE_ROOT: "/tmp/workspace",
        ALLOWED_OPEN_IDS: "ou_1",
      }),
    ).toThrow(/CODEX_SANDBOX_MODE/);
  });
});
