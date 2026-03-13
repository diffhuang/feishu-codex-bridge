import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isDirectCliExecution, runCli } from "../src/cli";

describe("runCli", () => {
  it("prints help without loading env or starting the bridge", async () => {
    const stdout: string[] = [];
    const loadEnv = vi.fn();
    const startBridge = vi.fn();

    const exitCode = await runCli({
      argv: ["--help"],
      loadEnv,
      startBridge,
      version: "0.2.0-test",
      writeStdout: (line) => {
        stdout.push(line);
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout.join("")).toContain("feishu-codex-bridge");
    expect(stdout.join("")).toContain("--version");
    expect(loadEnv).not.toHaveBeenCalled();
    expect(startBridge).not.toHaveBeenCalled();
  });

  it("prints the current package version without starting the bridge", async () => {
    const stdout: string[] = [];
    const startBridge = vi.fn();

    const exitCode = await runCli({
      argv: ["--version"],
      startBridge,
      version: "0.2.0-test",
      writeStdout: (line) => {
        stdout.push(line);
      },
    });

    expect(exitCode).toBe(0);
    expect(stdout).toEqual(["0.2.0-test"]);
    expect(startBridge).not.toHaveBeenCalled();
  });

  it("loads the env file from the current directory before starting the bridge", async () => {
    const loadEnv = vi.fn();
    const startBridge = vi.fn().mockResolvedValue(undefined);
    const env = {
      FEISHU_APP_ID: "cli_xxx",
    } as NodeJS.ProcessEnv;

    const exitCode = await runCli({
      argv: [],
      cwd: "/tmp/bridge-home",
      env,
      loadEnv,
      startBridge,
      version: "0.2.0-test",
    });

    expect(exitCode).toBe(0);
    expect(loadEnv).toHaveBeenCalledWith("/tmp/bridge-home");
    expect(startBridge).toHaveBeenCalledWith(env);
  });

  it("writes a local .env file from the packaged example", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "feishu-codex-bridge-cli-"));

    const exitCode = await runCli({
      argv: ["init"],
      cwd,
    });

    const envFile = await readFile(join(cwd, ".env"), "utf8");

    expect(exitCode).toBe(0);
    expect(envFile).toContain("FEISHU_APP_ID=");
    expect(envFile).toContain("CODEX_WORKSPACE_ROOT=");
  });

  it("refuses to overwrite an existing .env file", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "feishu-codex-bridge-cli-"));
    const stderr: string[] = [];
    await writeFile(join(cwd, ".env"), "EXISTING=1\n", "utf8");

    const exitCode = await runCli({
      argv: ["init"],
      cwd,
      writeStderr: (line) => {
        stderr.push(line);
      },
    });

    const envFile = await readFile(join(cwd, ".env"), "utf8");

    expect(exitCode).toBe(1);
    expect(envFile).toBe("EXISTING=1\n");
    expect(stderr.join("")).toContain(".env already exists");
  });

  it("treats the npm symlink path as a direct cli execution", () => {
    const result = isDirectCliExecution(
      "/tmp/npm-global/bin/feishu-codex-bridge",
      "file:///tmp/npm-global/lib/node_modules/feishu-codex-bridge/dist/cli.js",
      (path) => {
        if (path === "/tmp/npm-global/bin/feishu-codex-bridge") {
          return "/tmp/npm-global/lib/node_modules/feishu-codex-bridge/dist/cli.js";
        }

        return path;
      },
    );

    expect(result).toBe(true);
  });
});
