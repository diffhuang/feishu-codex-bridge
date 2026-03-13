export type BridgeConfig = {
  allowedOpenIds: string[];
  appId: string;
  appSecret: string;
  codexCommand: string;
  executionTailLines: number;
  logLevel: string;
  replyMaxChars: number;
  sandboxMode: "read-only" | "workspace-write" | "danger-full-access";
  timeoutMs: number;
  verboseEvents: boolean;
  workspaceRoot: string;
};

type EnvSource = Record<string, string | undefined>;

function requireEnv(env: EnvSource, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsed;
}

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
  key: string,
): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${key}: ${value}. Expected a positive number.`);
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean, key: string): boolean {
  if (!value?.trim()) {
    return fallback;
  }

  switch (value.trim().toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      throw new Error(`Invalid ${key}: ${value}. Expected true or false.`);
  }
}

function requireAsciiWorkspaceRoot(value: string): string {
  if (/[^\x00-\x7F]/u.test(value)) {
    throw new Error(
      "CODEX_WORKSPACE_ROOT must use a real ASCII-only directory because the current Codex CLI fails on non-ASCII workspace paths and still resolves symlinks back to the original Unicode path. Use a real directory such as /tmp/codex-live-workspace.",
    );
  }

  return value;
}

function parseSandboxMode(
  value: string | undefined,
): BridgeConfig["sandboxMode"] {
  const normalized = value?.trim() || "workspace-write";

  switch (normalized) {
    case "read-only":
    case "workspace-write":
    case "danger-full-access":
      return normalized;
    default:
      throw new Error(
        `Invalid CODEX_SANDBOX_MODE: ${normalized}. Expected read-only, workspace-write, or danger-full-access.`,
      );
  }
}

export function loadConfig(env: EnvSource): BridgeConfig {
  return {
    allowedOpenIds: requireEnv(env, "ALLOWED_OPEN_IDS")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    appId: requireEnv(env, "FEISHU_APP_ID"),
    appSecret: requireEnv(env, "FEISHU_APP_SECRET"),
    codexCommand: env.CODEX_COMMAND?.trim() || "codex",
    executionTailLines: parsePositiveNumber(
      env.CODEX_EXECUTION_TAIL_LINES,
      20,
      "CODEX_EXECUTION_TAIL_LINES",
    ),
    logLevel: env.LOG_LEVEL?.trim() || "info",
    replyMaxChars: parseNumber(env.REPLY_MAX_CHARS, 3500),
    sandboxMode: parseSandboxMode(env.CODEX_SANDBOX_MODE),
    timeoutMs: parseNumber(env.CODEX_TIMEOUT_MS, 600000),
    verboseEvents: parseBoolean(env.CODEX_VERBOSE_EVENTS, false, "CODEX_VERBOSE_EVENTS"),
    workspaceRoot: requireAsciiWorkspaceRoot(
      requireEnv(env, "CODEX_WORKSPACE_ROOT"),
    ),
  };
}
