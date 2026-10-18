/**
 * Storage for the optional chat's API key and provider choice.
 *
 * The key lives in sessionStorage only (see the note at the top of Chat.tsx). A
 * key saved by an earlier version sat in localStorage: it is moved across once,
 * then removed from localStorage so it no longer persists across tabs or restarts.
 *
 * Both stores are passed in, so the migration can be tested without a browser.
 * Callers wrap these in try/catch: storage can be disabled or full.
 */

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const CHAT_KEY_STORAGE = 'poe2-chat-key'
export const CHAT_PROVIDER_STORAGE = 'poe2-chat-provider'

export interface ChatSettings {
  apiKey: string
  provider: string | null
}

export function readChatSettings(local: KeyValueStore, session: KeyValueStore): ChatSettings {
  // A key saved by an earlier version lived in localStorage: carry it over once, then drop it.
  const legacyKey = local.getItem(CHAT_KEY_STORAGE)
  if (legacyKey) {
    if (!session.getItem(CHAT_KEY_STORAGE)) session.setItem(CHAT_KEY_STORAGE, legacyKey)
    local.removeItem(CHAT_KEY_STORAGE)
  }
  return {
    apiKey: session.getItem(CHAT_KEY_STORAGE) ?? '',
    provider: local.getItem(CHAT_PROVIDER_STORAGE),
  }
}

export function writeChatSettings(
  local: KeyValueStore,
  session: KeyValueStore,
  settings: { apiKey: string; provider: string },
): void {
  if (settings.apiKey) session.setItem(CHAT_KEY_STORAGE, settings.apiKey)
  else session.removeItem(CHAT_KEY_STORAGE)
  local.setItem(CHAT_PROVIDER_STORAGE, settings.provider)
}
