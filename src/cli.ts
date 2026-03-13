#!/usr/bin/env node
import dotenv from "dotenv";
import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBridge } from "./index.js";

type CliWriter = (line: string) => void;

export type RunCliOptions = {
  argv?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  loadEnv?: (cwd: string) => void;
  startBridge?: (env: NodeJS.ProcessEnv) => Promise<unknown>;
  version?: string;
  writeStderr?: CliWriter;
  writeStdout?: CliWriter;
};

const HELP_TEXT = [
  "Usage: feishu-codex-bridge [options]",
  "",
  "Options:",
  "  --help       Show help",
  "  --version    Show version",
  "  init         Write .env from the packaged example into the current directory",
  "",
  "Behavior:",
  "  - Reads .env from the current working directory",
  "  - Starts the Feishu long-connection bridge process",
].join("\n");

function loadEnvFromCurrentDirectory(cwd: string) {
  dotenv.config({
    path: resolve(cwd, ".env"),
  });
}

function readPackageVersion() {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: unknown;
  };

  return typeof packageJson.version === "string" && packageJson.version
    ? packageJson.version
    : "0.0.0";
}

function resolveEnvExamplePath() {
  return fileURLToPath(new URL("../.env.example", import.meta.url));
}

async function initializeEnvFile(cwd: string) {
  const envExamplePath = resolveEnvExamplePath();
  const targetEnvPath = resolve(cwd, ".env");

  try {
    await copyFile(envExamplePath, targetEnvPath, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
      throw new Error(".env already exists in the current directory.");
    }

    throw error;
  }
}

function formatCliError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isDirectCliExecution(
  argv1: string | undefined,
  moduleUrl = import.meta.url,
  realpathImpl: (path: string) => string = realpathSync,
) {
  if (!argv1) {
    return false;
  }

  try {
    return realpathImpl(argv1) === realpathImpl(fileURLToPath(moduleUrl));
  } catch {
    return false;
  }
}

export async function runCli(options: RunCliOptions = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  const writeStdout = options.writeStdout ?? ((line: string) => {
    console.log(line);
  });
  const writeStderr = options.writeStderr ?? ((line: string) => {
    console.error(line);
  });
  const version = options.version ?? readPackageVersion();

  if (argv.includes("--help")) {
    writeStdout(HELP_TEXT);
    return 0;
  }

  if (argv.includes("--version")) {
    writeStdout(version);
    return 0;
  }

  if (argv[0] === "init" && argv.length === 1) {
    const cwd = options.cwd ?? process.cwd();

    try {
      await initializeEnvFile(cwd);
      writeStdout(`Wrote ${resolve(cwd, ".env")}`);
      return 0;
    } catch (error) {
      writeStderr(formatCliError(error));
      return 1;
    }
  }

  if (argv.length > 0) {
    writeStderr(`Unknown argument: ${argv[0]}`);
    writeStderr("Run feishu-codex-bridge --help for usage.");
    return 1;
  }

  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const loadEnv = options.loadEnv ?? loadEnvFromCurrentDirectory;
  const startBridgeImpl = options.startBridge ?? startBridge;

  try {
    loadEnv(cwd);
    await startBridgeImpl(env);
    return 0;
  } catch (error) {
    writeStderr(formatCliError(error));
    return 1;
  }
}

if (isDirectCliExecution(process.argv[1])) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
