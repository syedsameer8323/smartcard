import api from "./api.js";

/**
 * Send a message to the AI shopping assistant.
 * JWT is attached automatically by the shared api interceptor.
 */
export async function sendAssistantMessage({ message, conversationId, sessionKey, productIds }) {
  const { data } = await api.post("/assistant/chat/", {
    message,
    conversation_id: conversationId || undefined,
    session_key: sessionKey || undefined,
    product_ids: productIds?.length ? productIds : undefined,
  });
  return data;
}

export async function fetchAssistantHistory(conversationId) {
  const { data } = await api.get("/assistant/history/", {
    params: { conversation_id: conversationId },
  });
  return data;
}

/** Guest-only anonymous key (not reused after login). */
export function getOrCreateGuestSessionKey() {
  const KEY = "sc_assistant_guest_sk";
  let key = sessionStorage.getItem(KEY);
  if (!key) {
    key = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(KEY, key);
  }
  return key;
}

export function clearAssistantStorage() {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const k = sessionStorage.key(i);
    if (k && (k.startsWith("sc_assistant_") || k === "fq_hint_seen")) keys.push(k);
  }
  keys.forEach((k) => sessionStorage.removeItem(k));
}

export function conversationStorageKey(userId) {
  return userId ? `sc_assistant_cid_u_${userId}` : "sc_assistant_cid_guest";
}
