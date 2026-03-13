import type { CodexResponseMode } from "./response-mode";

export type PromptBuilderInput = {
  responseMode: CodexResponseMode;
  text: string;
  workspaceRoot: string;
};

export function buildCodexPrompt(input: PromptBuilderInput): string {
  return [
    "You are handling a Feishu-triggered Codex task.",
    `Work only inside this workspace: ${input.workspaceRoot}`,
    "Reply with a concise plain-text answer for the user.",
    "If you want the bridge to send local files to Feishu, append this exact block at the end of your final reply:",
    "<FEISHU_ATTACHMENTS>",
    '{"attachments":[{"path":"relative/path/to/file.ext"}]}',
    "</FEISHU_ATTACHMENTS>",
    "Only include existing workspace-relative files, and do not mention the block in normal prose.",
    "Unless the task explicitly requires sending specific documents or a file bundle, send only the most important and relevant document instead of sending many related files.",
    "",
    `User request: ${input.text}`,
  ].join("\n");
}
