import type { CodexFileAttachment } from "./result-parser.js";

const ATTACHMENT_BLOCK_PATTERN =
  /\n?<FEISHU_ATTACHMENTS>\s*([\s\S]*?)\s*<\/FEISHU_ATTACHMENTS>\s*$/u;

export function parseAttachmentBlock(text: string): {
  attachments: CodexFileAttachment[];
  replyText: string;
} {
  const match = text.match(ATTACHMENT_BLOCK_PATTERN);
  if (!match) {
    return {
      attachments: [],
      replyText: text,
    };
  }

  try {
    const payload = JSON.parse(match[1] ?? "") as {
      attachments?: Array<{ path?: unknown }>;
    };

    if (!Array.isArray(payload.attachments)) {
      throw new Error("Invalid attachments payload.");
    }

    const attachments = payload.attachments.map((item, index) => {
      if (typeof item?.path !== "string" || !item.path.trim()) {
        throw new Error(`Attachment ${index + 1} is missing a valid path.`);
      }

      return {
        path: item.path.trim(),
        type: "file" as const,
      };
    });

    return {
      attachments,
      replyText: text.replace(ATTACHMENT_BLOCK_PATTERN, "").trim(),
    };
  } catch {
    return {
      attachments: [],
      replyText: text,
    };
  }
}
