import { describe, expect, it } from "vitest";
import { buildGuardRejectionMessage } from "../src/bridge/rejection-message";

describe("buildGuardRejectionMessage", () => {
  it("includes open_id when sender is not allowlisted", () => {
    expect(
      buildGuardRejectionMessage("sender_not_allowed", {
        senderOpenId: "ou_debug_123",
      }),
    ).toContain("open_id=ou_debug_123");
  });

  it("keeps other guard reasons generic", () => {
    expect(
      buildGuardRejectionMessage("unsupported_message_type", {
        senderOpenId: "ou_debug_123",
      }),
    ).toBe("Request rejected: unsupported_message_type.");
  });
});
