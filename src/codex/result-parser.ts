export type CodexFileAttachment = {
  path: string;
  type: "file";
};

export type ParsedCodexResult = {
  attachments: CodexFileAttachment[];
  reply: string;
};

const MAX_ATTACHMENTS = 3;

export function parseCodexResultPayload(payload: string): ParsedCodexResult {
  const parsed = JSON.parse(payload) as {
    attachments?: unknown;
    reply?: unknown;
  };

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Codex result must be a JSON object.");
  }

  if (typeof parsed.reply !== "string") {
    throw new Error("Codex result must include a string reply.");
  }

  const rawAttachments = parsed.attachments ?? [];
  if (!Array.isArray(rawAttachments)) {
    throw new Error("Codex attachments must be an array.");
  }

  if (rawAttachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Codex returned more than ${MAX_ATTACHMENTS} attachments.`);
  }

  const attachments = rawAttachments.map((attachment, index) => {
    if (!attachment || typeof attachment !== "object" || Array.isArray(attachment)) {
      throw new Error(`Attachment ${index + 1} must be an object.`);
    }

    const path = (attachment as { path?: unknown }).path;
    const type = (attachment as { type?: unknown }).type;
    if (type !== "file" || typeof path !== "string" || !path.trim()) {
      throw new Error(`Attachment ${index + 1} must include type=file and a non-empty path.`);
    }

    return {
      path: path.trim(),
      type: "file" as const,
    };
  });

  return {
    attachments,
    reply: parsed.reply,
  };
}

export function extractThreadIdFromJsonl(jsonl: string): string | undefined {
  const lines = jsonl
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as {
        thread_id?: unknown;
        type?: unknown;
      };

      if (parsed.type === "thread.started" && typeof parsed.thread_id === "string") {
        return parsed.thread_id;
      }
    } catch {
      // Ignore non-JSON log lines.
    }
  }

  return undefined;
}

export function extractAgentMessageFromJsonl(jsonl: string): string | undefined {
  const lines = jsonl
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  let latestAgentMessage: string | undefined;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as {
        item?: {
          text?: unknown;
          type?: unknown;
        };
        type?: unknown;
      };

      if (
        parsed.type === "item.completed"
        && parsed.item?.type === "agent_message"
        && typeof parsed.item.text === "string"
      ) {
        latestAgentMessage = parsed.item.text;
      }
    } catch {
      // Ignore non-JSON log lines.
    }
  }

  return latestAgentMessage;
}
