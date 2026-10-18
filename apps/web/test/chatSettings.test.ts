import { describe, expect, it } from "vitest";
import { CHAT_KEY_STORAGE, CHAT_PROVIDER_STORAGE, readChatSettings, writeChatSettings } from "@/lib/chatSettings";

class MemoryStore {
  readonly items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

describe("chat key storage", () => {
  it("writes the key to sessionStorage only and the provider to localStorage", () => {
    const local = new MemoryStore();
    const session = new MemoryStore();
    writeChatSettings(local, session, { apiKey: "secret", provider: "openai" });

    expect(session.getItem(CHAT_KEY_STORAGE)).toBe("secret");
    expect(local.getItem(CHAT_KEY_STORAGE)).toBeNull();
    expect(local.getItem(CHAT_PROVIDER_STORAGE)).toBe("openai");
  });

  it("clears the session key when it is set to empty", () => {
    const local = new MemoryStore();
    const session = new MemoryStore();
    writeChatSettings(local, session, { apiKey: "secret", provider: "gemini" });
    writeChatSettings(local, session, { apiKey: "", provider: "gemini" });

    expect(session.getItem(CHAT_KEY_STORAGE)).toBeNull();
  });

  it("moves a key left in localStorage by an earlier version into sessionStorage once", () => {
    const local = new MemoryStore();
    const session = new MemoryStore();
    local.setItem(CHAT_KEY_STORAGE, "old-key");
    local.setItem(CHAT_PROVIDER_STORAGE, "anthropic");

    const settings = readChatSettings(local, session);

    expect(settings).toEqual({ apiKey: "old-key", provider: "anthropic" });
    expect(session.getItem(CHAT_KEY_STORAGE)).toBe("old-key");
    expect(local.getItem(CHAT_KEY_STORAGE)).toBeNull();
  });

  it("keeps a session key over a leftover localStorage key, and still removes the leftover", () => {
    const local = new MemoryStore();
    const session = new MemoryStore();
    local.setItem(CHAT_KEY_STORAGE, "old-key");
    session.setItem(CHAT_KEY_STORAGE, "new-key");

    const settings = readChatSettings(local, session);

    expect(settings.apiKey).toBe("new-key");
    expect(local.getItem(CHAT_KEY_STORAGE)).toBeNull();
  });

  it("returns empty settings when nothing is stored", () => {
    expect(readChatSettings(new MemoryStore(), new MemoryStore())).toEqual({ apiKey: "", provider: null });
  });
});
