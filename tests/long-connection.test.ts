import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => {
  const clientCtor = vi.fn().mockImplementation((params) => ({ params }));
  const wsClientCtor = vi.fn().mockImplementation((params) => ({
    params,
    start: vi.fn(),
  }));
  const register = vi.fn().mockImplementation((handlers) => ({ handlers }));
  const eventDispatcherCtor = vi.fn().mockImplementation((params) => ({
    params,
    register,
  }));

  return {
    clientCtor,
    eventDispatcherCtor,
    register,
    wsClientCtor,
  };
});

vi.mock("@larksuiteoapi/node-sdk", () => ({
  Client: sdk.clientCtor,
  EventDispatcher: sdk.eventDispatcherCtor,
  LoggerLevel: {
    debug: 4,
    error: 1,
    fatal: 0,
    info: 3,
    trace: 5,
    warn: 2,
  },
  WSClient: sdk.wsClientCtor,
}));

import {
  createFeishuClient,
  createLongConnectionClient,
} from "../src/feishu/long-connection";

describe("long connection client", () => {
  beforeEach(() => {
    sdk.clientCtor.mockClear();
    sdk.eventDispatcherCtor.mockClear();
    sdk.register.mockClear();
    sdk.wsClientCtor.mockClear();
  });

  it("passes a custom logger into the Feishu HTTP client", () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    };

    createFeishuClient({
      appId: "cli_xxx",
      appSecret: "secret",
      logLevel: "warn",
      logger,
    });

    expect(sdk.clientCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "cli_xxx",
        appSecret: "secret",
        logger,
        loggerLevel: 2,
      }),
    );
  });

  it("passes the same logger into the websocket client and dispatcher", () => {
    const logger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    };

    createLongConnectionClient({
      appId: "cli_xxx",
      appSecret: "secret",
      logLevel: "info",
      logger,
      onMessage: vi.fn(),
    });

    expect(sdk.wsClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "cli_xxx",
        appSecret: "secret",
        logger,
        loggerLevel: 3,
      }),
    );
    expect(sdk.eventDispatcherCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        loggerLevel: 3,
      }),
    );
  });
});
