import { describe, expect, it } from "vitest";
import { parseAttachmentBlock } from "../src/codex/attachment-block";

describe("parseAttachmentBlock", () => {
  it("returns plain text unchanged when no block is present", () => {
    expect(parseAttachmentBlock("你好")).toEqual({
      attachments: [],
      replyText: "你好",
    });
  });

  it("extracts attachments and strips the block from the reply", () => {
    expect(
      parseAttachmentBlock(
        [
          "已经找到需要的文件。",
          "",
          "<FEISHU_ATTACHMENTS>",
          '{"attachments":[{"path":"docs/report.md"},{"path":"project/out.txt"}]}',
          "</FEISHU_ATTACHMENTS>",
        ].join("\n"),
      ),
    ).toEqual({
      attachments: [
        { path: "docs/report.md", type: "file" },
        { path: "project/out.txt", type: "file" },
      ],
      replyText: "已经找到需要的文件。",
    });
  });

  it("leaves malformed attachment blocks untouched", () => {
    const text = [
      "这里是结果。",
      "",
      "<FEISHU_ATTACHMENTS>",
      '{"attachments":"oops"}',
      "</FEISHU_ATTACHMENTS>",
    ].join("\n");

    expect(parseAttachmentBlock(text)).toEqual({
      attachments: [],
      replyText: text,
    });
  });
});
