import { describe, expect, it } from "vitest";
import { evaluateRequest } from "../src/bridge/permission-guard";

describe("evaluateRequest", () => {
  it("accepts an allowed private text request", () => {
    const result = evaluateRequest(
      {
        senderOpenId: "ou_1",
        messageType: "text",
        chatType: "p2p",
        text: "hello",
      },
      {
        allowedOpenIds: ["ou_1"],
        maxInputChars: 1000,
      },
    );

    expect(result.allowed).toBe(true);
  });
});
