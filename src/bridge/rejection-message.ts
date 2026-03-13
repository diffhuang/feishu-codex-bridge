import type { GuardResult, NormalizedRequest } from "../types";

export function buildGuardRejectionMessage(
  reason: GuardResult["reason"],
  request: Pick<NormalizedRequest, "senderOpenId">,
): string {
  if (!reason) {
    return "Request rejected.";
  }

  if (reason === "sender_not_allowed") {
    return `Request rejected: sender_not_allowed. open_id=${request.senderOpenId}`;
  }

  return `Request rejected: ${reason}.`;
}
