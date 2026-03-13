import { describe, expect, it } from "vitest";
import { buildCodexPrompt } from "../src/codex/prompt-builder";

describe("buildCodexPrompt", () => {
  it("explains the optional attachment block protocol", () => {
    const prompt = buildCodexPrompt({
      responseMode: "structured",
      workspaceRoot: "/tmp/workspace",
      text: "read README and summarize",
    });

    expect(prompt).toContain("/tmp/workspace");
    expect(prompt).toContain("read README and summarize");
    expect(prompt).toContain("<FEISHU_ATTACHMENTS>");
    expect(prompt).toContain("\"attachments\"");
  });

  it("keeps ordinary chat in plain text mode", () => {
    const prompt = buildCodexPrompt({
      responseMode: "text",
      workspaceRoot: "/tmp/workspace",
      text: "你好",
    });

    expect(prompt).toContain("/tmp/workspace");
    expect(prompt).toContain("你好");
    expect(prompt).toContain("<FEISHU_ATTACHMENTS>");
    expect(prompt).toContain("\"attachments\"");
  });

  it("tells Codex to default to only the most important documents unless the user explicitly asks for specific files or a file bundle", () => {
    const prompt = buildCodexPrompt({
      responseMode: "text",
      workspaceRoot: "/tmp/workspace",
      text: "把相关文档发给我",
    });

    expect(prompt).toContain("Unless the task explicitly requires sending specific documents or a file bundle");
    expect(prompt).toContain("send only the most important and relevant document");
  });
});
