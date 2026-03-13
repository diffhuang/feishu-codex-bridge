export type ParsedCodexEvent = {
  command?: string;
  exitCode?: number;
  itemType?: string;
  rawLine: string;
  status?: string;
  text?: string;
  type: string;
};

export function parseCodexEventLine(line: string): ParsedCodexEvent | undefined {
  const rawLine = line.trim();
  if (!rawLine) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawLine) as {
      item?: {
        command?: unknown;
        exit_code?: unknown;
        status?: unknown;
        text?: unknown;
        type?: unknown;
      };
      type?: unknown;
    };

    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
      return undefined;
    }

    return {
      command: typeof parsed.item?.command === "string" ? parsed.item.command : undefined,
      exitCode: typeof parsed.item?.exit_code === "number" ? parsed.item.exit_code : undefined,
      itemType: typeof parsed.item?.type === "string" ? parsed.item.type : undefined,
      rawLine,
      status: typeof parsed.item?.status === "string" ? parsed.item.status : undefined,
      text: typeof parsed.item?.text === "string" ? parsed.item.text : undefined,
      type: parsed.type,
    };
  } catch {
    return undefined;
  }
}
