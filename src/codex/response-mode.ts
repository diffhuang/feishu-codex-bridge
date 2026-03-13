export type CodexResponseMode = "structured" | "text";

export function selectCodexResponseMode(text: string): CodexResponseMode {
  return "text";
}
