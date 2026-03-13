import { inspect } from "node:util";

export type BridgeLogLevel = "error" | "warn" | "info" | "debug" | "trace";
export type BridgeLogger = {
  debug: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

type TimestampLoggerOptions = {
  level?: string;
  now?: () => Date;
  offsetMinutes?: number;
  write?: (level: BridgeLogLevel, line: string) => void;
};

const logLevelPriority: Record<BridgeLogLevel, number> = {
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const consoleWriter: Record<BridgeLogLevel, (line: string) => void> = {
  debug: (line) => console.debug(line),
  error: (line) => console.error(line),
  info: (line) => console.info(line),
  trace: (line) => console.trace(line),
  warn: (line) => console.warn(line),
};

export function defaultConsoleLogWriter(level: BridgeLogLevel, line: string) {
  consoleWriter[level](line);
}

function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

function normalizeLogArgs(args: unknown[]) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0] as unknown[];
  }

  return args;
}

function formatLogValue(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }

  return inspect(value, {
    breakLength: Infinity,
    colors: false,
    compact: true,
    depth: 5,
  });
}

function shouldWrite(level: BridgeLogLevel, minimumLevel: BridgeLogLevel) {
  return logLevelPriority[level] <= logLevelPriority[minimumLevel];
}

export function toBridgeLogLevel(level: string): BridgeLogLevel {
  switch (level) {
    case "error":
    case "warn":
    case "info":
    case "debug":
    case "trace":
      return level;
    default:
      return "info";
  }
}

export function formatTimestamp(
  date: Date,
  offsetMinutes = -date.getTimezoneOffset(),
) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainderMinutes = absoluteOffset % 60;

  return [
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}.${pad(shifted.getUTCMilliseconds(), 3)}`,
    `${sign}${pad(offsetHours)}:${pad(offsetRemainderMinutes)}`,
  ].join("");
}

export function formatTimestampedLogLine(
  level: BridgeLogLevel,
  args: unknown[],
  options: Pick<TimestampLoggerOptions, "now" | "offsetMinutes"> = {},
) {
  const date = options.now ? options.now() : new Date();
  const message = normalizeLogArgs(args).map(formatLogValue).join(" ");

  return `${formatTimestamp(date, options.offsetMinutes)} [${level}] ${message}`;
}

export function createTimestampLogger(
  options: TimestampLoggerOptions = {},
): BridgeLogger {
  const minimumLevel = toBridgeLogLevel(options.level ?? "info");
  const write = options.write ?? defaultConsoleLogWriter;

  const createMethod = (level: BridgeLogLevel) => (...args: unknown[]) => {
    if (!shouldWrite(level, minimumLevel)) {
      return;
    }

    write(level, formatTimestampedLogLine(level, args, options));
  };

  return {
    debug: createMethod("debug"),
    error: createMethod("error"),
    info: createMethod("info"),
    trace: createMethod("trace"),
    warn: createMethod("warn"),
  };
}
