import { homedir } from "node:os";
import { join } from "node:path";

export type RuntimePaths = {
  appDir: string;
  logDir: string;
  requestLogDir: string;
};

type ResolveRuntimePathsOptions = {
  homeDir?: string;
};

export function resolveRuntimePaths(
  options: ResolveRuntimePathsOptions = {},
): RuntimePaths {
  const appDir = join(options.homeDir ?? homedir(), ".feishu-codex-bridge");
  const logDir = join(appDir, "logs");

  return {
    appDir,
    logDir,
    requestLogDir: join(logDir, "requests"),
  };
}
