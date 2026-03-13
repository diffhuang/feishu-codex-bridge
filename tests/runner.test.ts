import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { runCodex } from "../src/codex/runner";

function createChildProcessMock() {
  const child = new EventEmitter() as EventEmitter & {
    kill: ReturnType<typeof vi.fn>;
    stderr: EventEmitter;
    stdout: EventEmitter;
  };

  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();

  return child;
}

describe("runCodex", () => {
  it("starts codex with structured output capture for a new session", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);
    const artifacts = {
      cleanup: vi.fn(),
      outputPath: "/tmp/codex-output.json",
      readOutput: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ reply: "assistant output" })),
      schemaPath: "/tmp/codex-schema.json",
    };

    const resultPromise = runCodex({
      artifacts,
      command: "codex",
      prompt: "hello",
      responseMode: "structured",
      sandboxMode: "workspace-write",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
    );
    child.stderr.emit("data", "warning");
    child.emit("close", 0);

    await expect(resultPromise).resolves.toEqual({
      attachments: [],
      exitCode: 0,
      ok: true,
      reply: "assistant output",
      sessionId: "thread_1",
      stderr: "warning",
      stdout: JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
      timedOut: false,
    });

    expect(spawnImpl).toHaveBeenCalledWith(
      "codex",
      [
        "-C",
        "/tmp/workspace",
        "exec",
        "--sandbox",
        "workspace-write",
        "--skip-git-repo-check",
        "--json",
        "--output-schema",
        "/tmp/codex-schema.json",
        "-o",
        "/tmp/codex-output.json",
        "hello",
      ],
      expect.objectContaining({
        cwd: "/tmp/workspace",
      }),
    );
    expect(artifacts.cleanup).toHaveBeenCalled();
  });

  it("uses exec resume when a session id is provided", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);

    const resultPromise = runCodex({
      artifacts: {
        cleanup: vi.fn(),
        outputPath: "/tmp/codex-output.json",
        readOutput: vi.fn().mockResolvedValue(JSON.stringify({ reply: "next" })),
        schemaPath: "/tmp/codex-schema.json",
      },
      command: "codex",
      prompt: "next",
      responseMode: "structured",
      sandboxMode: "workspace-write",
      sessionId: "thread_1",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.emit("close", 0);
    await resultPromise;

    expect(spawnImpl).toHaveBeenCalledWith(
      "codex",
      [
        "-C",
        "/tmp/workspace",
        "exec",
        "--sandbox",
        "workspace-write",
        "resume",
        "--skip-git-repo-check",
        "--json",
        "--output-schema",
        "/tmp/codex-schema.json",
        "-o",
        "/tmp/codex-output.json",
        "thread_1",
        "next",
      ],
      expect.objectContaining({
        cwd: "/tmp/workspace",
      }),
    );
  });

  it("falls back to the agent message in stdout jsonl when the output file is empty", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);

    const resultPromise = runCodex({
      artifacts: {
        cleanup: vi.fn(),
        outputPath: "/tmp/codex-output.json",
        readOutput: vi.fn().mockRejectedValue(new Error("ENOENT")),
        schemaPath: "/tmp/codex-schema.json",
      },
      command: "codex",
      prompt: "hello",
      responseMode: "structured",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      [
        JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
        JSON.stringify({
          item: {
            id: "item_1",
            text: "{\"reply\":\"fallback\"}",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      ].join("\n"),
    );
    child.emit("close", 0);

    await expect(resultPromise).resolves.toEqual({
      attachments: [],
      exitCode: 0,
      ok: true,
      reply: "fallback",
      sessionId: "thread_1",
      stderr: "",
      stdout: [
        JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
        JSON.stringify({
          item: {
            id: "item_1",
            text: "{\"reply\":\"fallback\"}",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      ].join("\n"),
      timedOut: false,
    });
  });

  it("treats a structured agent reply as success even when codex exits non-zero", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);

    const resultPromise = runCodex({
      artifacts: {
        cleanup: vi.fn(),
        outputPath: "/tmp/codex-output.json",
        readOutput: vi.fn().mockRejectedValue(new Error("ENOENT")),
        schemaPath: "/tmp/codex-schema.json",
      },
      command: "codex",
      prompt: "hello",
      responseMode: "structured",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      JSON.stringify({
        item: {
          id: "item_1",
          text: "{\"reply\":\"usable\"}",
          type: "agent_message",
        },
        type: "item.completed",
      }),
    );
    child.stderr.emit(
      "data",
      "Warning: no last agent message; wrote empty content to /tmp/out.json",
    );
    child.emit("close", 1);

    await expect(resultPromise).resolves.toEqual({
      attachments: [],
      exitCode: 1,
      ok: true,
      reply: "usable",
      sessionId: undefined,
      stderr: "Warning: no last agent message; wrote empty content to /tmp/out.json",
      stdout: JSON.stringify({
        item: {
          id: "item_1",
          text: "{\"reply\":\"usable\"}",
          type: "agent_message",
        },
        type: "item.completed",
      }),
      timedOut: false,
    });
  });

  it("uses plain text mode without schema output files for ordinary chat", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);

    const resultPromise = runCodex({
      command: "codex",
      prompt: "你好",
      responseMode: "text",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      [
        JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
        JSON.stringify({
          item: {
            id: "item_1",
            text: "你好",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      ].join("\n"),
    );
    child.emit("close", 0);

    await expect(resultPromise).resolves.toEqual({
      attachments: [],
      exitCode: 0,
      ok: true,
      reply: "你好",
      sessionId: "thread_1",
      stderr: "",
      stdout: [
        JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
        JSON.stringify({
          item: {
            id: "item_1",
            text: "你好",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      ].join("\n"),
      timedOut: false,
    });

    expect(spawnImpl).toHaveBeenCalledWith(
      "codex",
      [
        "-C",
        "/tmp/workspace",
        "exec",
        "--sandbox",
        "workspace-write",
        "--skip-git-repo-check",
        "--json",
        "你好",
      ],
      expect.objectContaining({
        cwd: "/tmp/workspace",
      }),
    );
  });

  it("extracts file attachments from the plain text attachment block", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);

    const resultPromise = runCodex({
      command: "codex",
      prompt: "把报告发给我",
      responseMode: "text",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      JSON.stringify({
        item: {
          id: "item_1",
          text: [
            "已经找到报告。",
            "",
            "<FEISHU_ATTACHMENTS>",
            '{"attachments":[{"path":"docs/report.md"}]}',
            "</FEISHU_ATTACHMENTS>",
          ].join("\n"),
          type: "agent_message",
        },
        type: "item.completed",
      }),
    );
    child.emit("close", 0);

    await expect(resultPromise).resolves.toEqual({
      attachments: [{ path: "docs/report.md", type: "file" }],
      exitCode: 0,
      ok: true,
      reply: "已经找到报告。",
      sessionId: undefined,
      stderr: "",
      stdout: JSON.stringify({
        item: {
          id: "item_1",
          text: [
            "已经找到报告。",
            "",
            "<FEISHU_ATTACHMENTS>",
            '{"attachments":[{"path":"docs/report.md"}]}',
            "</FEISHU_ATTACHMENTS>",
          ].join("\n"),
          type: "agent_message",
        },
        type: "item.completed",
      }),
      timedOut: false,
    });
  });

  it("emits complete stdout jsonl lines through the event callback while codex is still running", async () => {
    const child = createChildProcessMock();
    const spawnImpl = vi.fn().mockReturnValue(child);
    const onEventLine = vi.fn();

    const resultPromise = runCodex({
      command: "codex",
      onEventLine,
      prompt: "你好",
      responseMode: "text",
      spawnImpl,
      timeoutMs: 1000,
      workspaceRoot: "/tmp/workspace",
    });

    child.stdout.emit(
      "data",
      `${JSON.stringify({ type: "thread.started", thread_id: "thread_1" })}\n`,
    );
    child.stdout.emit(
      "data",
      [
        JSON.stringify({
          item: {
            id: "item_1",
            text: "step one",
            type: "tool_call",
          },
          type: "item.started",
        }),
        JSON.stringify({
          item: {
            id: "item_2",
            text: "你好",
            type: "agent_message",
          },
          type: "item.completed",
        }),
      ].join("\n"),
    );
    child.emit("close", 0);

    await resultPromise;

    expect(onEventLine).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({ type: "thread.started", thread_id: "thread_1" }),
    );
    expect(onEventLine).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        item: {
          id: "item_1",
          text: "step one",
          type: "tool_call",
        },
        type: "item.started",
      }),
    );
    expect(onEventLine).toHaveBeenNthCalledWith(
      3,
      JSON.stringify({
        item: {
          id: "item_2",
          text: "你好",
          type: "agent_message",
        },
        type: "item.completed",
      }),
    );
  });
});
