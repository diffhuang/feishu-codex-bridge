import { describe, expect, it } from "vitest";
import { selectCodexResponseMode } from "../src/codex/response-mode";

describe("selectCodexResponseMode", () => {
  it("uses plain text mode for ordinary chat", () => {
    expect(selectCodexResponseMode("你好")).toBe("text");
    expect(selectCodexResponseMode("read README and summarize")).toBe("text");
  });

  it("keeps file-related requests in plain text mode too", () => {
    expect(selectCodexResponseMode("生成一个 txt 文件并发给我")).toBe("text");
    expect(selectCodexResponseMode("create a markdown file and send it to me")).toBe("text");
    expect(selectCodexResponseMode("请把 docs/report.md 发给我")).toBe("text");
  });
});
