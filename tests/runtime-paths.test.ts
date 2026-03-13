import { describe, expect, it } from "vitest";
import { resolveRuntimePaths } from "../src/runtime/paths";

describe("resolveRuntimePaths", () => {
  it("stores runtime files under a stable directory in the user's home", () => {
    const paths = resolveRuntimePaths({
      homeDir: "/tmp/bridge-user",
    });

    expect(paths.appDir).toBe("/tmp/bridge-user/.feishu-codex-bridge");
    expect(paths.logDir).toBe("/tmp/bridge-user/.feishu-codex-bridge/logs");
    expect(paths.requestLogDir).toBe("/tmp/bridge-user/.feishu-codex-bridge/logs/requests");
  });
});
