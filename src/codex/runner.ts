import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAttachmentBlock } from "./attachment-block";
import {
  extractAgentMessageFromJsonl,
  extractThreadIdFromJsonl,
  parseCodexResultPayload,
  type CodexFileAttachment,
} from "./result-parser";
import type { CodexResponseMode } from "./response-mode";

export type CodexRunInput = {
  artifacts?: CodexRunArtifacts;
  command: string;
  onEventLine?: (line: string) => void;
  prompt: string;
  responseMode?: CodexResponseMode;
  sandboxMode?: "read-only" | "workspace-write" | "danger-full-access";
  sessionId?: string;
  spawnImpl?: (
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio,
  ) => ChildProcessWithoutNullStreams;
  timeoutMs: number;
  workspaceRoot: string;
};

export type CodexRunArtifacts = {
  cleanup: () => Promise<void> | void;
  outputPath: string;
  readOutput: () => Promise<string>;
  schemaPath: string;
};

export type CodexRunResult = {
  attachments: CodexFileAttachment[];
  exitCode: number | null;
  ok: boolean;
  reply?: string;
  sessionId?: string;
  stderr: string;
  stdout: string;
  timedOut: boolean;
};

export async function runCodex(
  input: CodexRunInput,
): Promise<CodexRunResult> {
  const responseMode = input.responseMode ?? "structured";
  const artifacts = responseMode === "structured"
    ? input.artifacts ?? await createDefaultArtifacts()
    : undefined;

  return new Promise((resolve, reject) => {
    const spawnImpl = input.spawnImpl ?? spawn;
    const child = spawnImpl(
      input.command,
      buildCodexArgs(input, artifacts),
      {
        cwd: input.workspaceRoot,
        stdio: "pipe",
      },
    );

    let stdout = "";
    let stderr = "";
    let stdoutLineBuffer = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, input.timeoutMs);

    child.stdout.on("data", (chunk) => {
      const chunkText = chunk.toString();
      stdout += chunkText;
      stdoutLineBuffer += chunkText;

      const lines = stdoutLineBuffer.split(/\r?\n/u);
      stdoutLineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          continue;
        }

        input.onEventLine?.(trimmedLine);
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.once("error", (error) => {
      clearTimeout(timer);
      void cleanupArtifacts(artifacts).finally(() => {
        reject(error);
      });
    });

    child.once("close", (exitCode) => {
      void (async () => {
        clearTimeout(timer);

        try {
          const trailingStdoutLine = stdoutLineBuffer.trim();
          if (trailingStdoutLine) {
            input.onEventLine?.(trailingStdoutLine);
          }

          const trimmedStdout = stdout.trim();
          const trimmedStderr = stderr.trim();
          const rawTextReply = responseMode === "text"
            ? extractAgentMessageFromJsonl(trimmedStdout)
            : undefined;
          const parsedTextReply = rawTextReply
            ? parseAttachmentBlock(rawTextReply)
            : undefined;
          let reply = parsedTextReply?.replyText;
          let attachments: CodexFileAttachment[] = parsedTextReply?.attachments ?? [];
          let ok = (exitCode === 0 && !timedOut) || Boolean(reply);

          if (!timedOut && responseMode === "structured" && artifacts) {
            try {
              const parsed = await readStructuredResult(artifacts, trimmedStdout);
              reply = parsed.reply;
              attachments = parsed.attachments;
              ok = true;
            } catch (error) {
              if (ok) {
                ok = false;
                stderr = error instanceof Error ? error.message : "Failed to parse Codex result payload.";
              }
            }
          }

          resolve({
            attachments,
            exitCode,
            ok,
            reply,
            sessionId: extractThreadIdFromJsonl(trimmedStdout) ?? input.sessionId,
            stderr: ok ? trimmedStderr : stderr.trim(),
            stdout: trimmedStdout,
            timedOut,
          });
        } catch (error) {
          reject(error);
        } finally {
          await cleanupArtifacts(artifacts);
        }
      })();
    });
  });
}

async function readStructuredResult(
  artifacts: Pick<CodexRunArtifacts, "readOutput">,
  stdout: string,
) {
  try {
    return parseCodexResultPayload(await artifacts.readOutput());
  } catch (error) {
    const fallbackPayload = extractAgentMessageFromJsonl(stdout);
    if (fallbackPayload) {
      return parseCodexResultPayload(fallbackPayload);
    }

    throw error;
  }
}

function buildCodexArgs(
  input: Pick<CodexRunInput, "prompt" | "responseMode" | "sandboxMode" | "sessionId" | "workspaceRoot">,
  artifacts?: Pick<CodexRunArtifacts, "outputPath" | "schemaPath">,
): string[] {
  const responseMode = input.responseMode ?? "structured";
  const sandboxMode = input.sandboxMode ?? "workspace-write";
  const execArgs = [
    "--sandbox",
    sandboxMode,
  ];
  const commandArgs = responseMode === "structured" && artifacts
    ? [
        "--skip-git-repo-check",
        "--json",
        "--output-schema",
        artifacts.schemaPath,
        "-o",
        artifacts.outputPath,
      ]
    : [
        "--skip-git-repo-check",
        "--json",
      ];

  if (input.sessionId) {
    return [
      "-C",
      input.workspaceRoot,
      "exec",
      ...execArgs,
      "resume",
      ...commandArgs,
      input.sessionId,
      input.prompt,
    ];
  }

  return [
    "-C",
    input.workspaceRoot,
    "exec",
    ...execArgs,
    ...commandArgs,
    input.prompt,
  ];
}

async function createDefaultArtifacts(): Promise<CodexRunArtifacts> {
  const tempDirectory = await mkdtemp(join(tmpdir(), "feishu-codex-run-"));
  const outputPath = join(tempDirectory, "last-message.json");
  const schemaPath = fileURLToPath(new URL("./result-schema.json", import.meta.url));

  return {
    cleanup: async () => {
      await rm(tempDirectory, {
        force: true,
        recursive: true,
      });
    },
    outputPath,
    readOutput: () => readFile(outputPath, "utf8"),
    schemaPath,
  };
}

async function cleanupArtifacts(
  artifacts?: Pick<CodexRunArtifacts, "cleanup">,
): Promise<void> {
  await Promise.resolve(artifacts?.cleanup?.()).catch(() => undefined);
}
