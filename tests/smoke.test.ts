import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { projectMetadata } from "../src/index";

describe("project metadata", () => {
  it("exposes the bridge name", () => {
    expect(projectMetadata.name).toBe("feishu-codex-bridge");
  });

  it("ships npm publish metadata for the global cli", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      bin?: Record<string, string>;
      exports?: Record<string, string>;
      private?: boolean;
      version?: string;
    };

    expect(manifest.private).toBe(false);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.bin).toEqual({
      "feishu-codex-bridge": "./dist/cli.js",
    });
    expect(manifest.exports).toEqual({
      ".": "./dist/index.js",
    });
  });
});
