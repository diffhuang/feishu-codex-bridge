import { describe, expect, it } from "vitest";
import { projectMetadata } from "../src/index";

describe("project metadata", () => {
  it("exposes the bridge name", () => {
    expect(projectMetadata.name).toBe("feishu-codex-bridge");
  });
});
