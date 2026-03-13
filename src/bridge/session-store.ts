export type RequestStatus = "done" | "failed" | "queued" | "running";

export type ChatSessionState = {
  lastRequestId?: string;
  lastStatus?: RequestStatus;
  lastUpdatedAt?: string;
  sessionId?: string;
};

export type SessionStore = {
  clearSessionId: (chatId: string) => void;
  finish: (chatId: string, requestId: string, status: RequestStatus) => void;
  getActiveChatId: () => string | null;
  getChatState: (chatId: string) => ChatSessionState | undefined;
  getSessionId: (chatId: string) => string | undefined;
  getStatus: (requestId: string) => RequestStatus | undefined;
  hasSeen: (messageId: string) => boolean;
  isBusy: () => boolean;
  markSeen: (messageId: string) => void;
  setSessionId: (chatId: string, sessionId: string) => void;
  start: (chatId: string, requestId: string) => void;
};

export function createInMemorySessionStore(
  now: () => string = () => new Date().toISOString(),
): SessionStore {
  const seenMessageIds = new Set<string>();
  const requestStatuses = new Map<string, RequestStatus>();
  const chatStates = new Map<string, ChatSessionState>();
  let activeRequestId: string | null = null;
  let activeChatId: string | null = null;

  function mergeChatState(
    chatId: string,
    update: Partial<ChatSessionState>,
  ): void {
    const current = chatStates.get(chatId) ?? {};
    chatStates.set(chatId, {
      ...current,
      ...update,
      lastUpdatedAt: now(),
    });
  }

  return {
    clearSessionId(chatId: string) {
      if (!chatStates.has(chatId)) {
        return;
      }

      mergeChatState(chatId, { sessionId: undefined });
    },
    finish(chatId: string, requestId: string, status: RequestStatus) {
      requestStatuses.set(requestId, status);
      mergeChatState(chatId, {
        lastRequestId: requestId,
        lastStatus: status,
      });
      if (activeRequestId === requestId) {
        activeRequestId = null;
        activeChatId = null;
      }
    },
    getActiveChatId() {
      return activeChatId;
    },
    getChatState(chatId: string) {
      const current = chatStates.get(chatId);

      return current ? { ...current } : undefined;
    },
    getSessionId(chatId: string) {
      return chatStates.get(chatId)?.sessionId;
    },
    getStatus(requestId: string) {
      return requestStatuses.get(requestId);
    },
    hasSeen(messageId: string) {
      return seenMessageIds.has(messageId);
    },
    isBusy() {
      return activeRequestId !== null;
    },
    markSeen(messageId: string) {
      seenMessageIds.add(messageId);
    },
    setSessionId(chatId: string, sessionId: string) {
      mergeChatState(chatId, { sessionId });
    },
    start(chatId: string, requestId: string) {
      activeRequestId = requestId;
      activeChatId = chatId;
      requestStatuses.set(requestId, "running");
      mergeChatState(chatId, {
        lastRequestId: requestId,
        lastStatus: "running",
      });
    },
  };
}
