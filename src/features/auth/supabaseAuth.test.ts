import type { SupabaseClient } from "@supabase/supabase-js";
import type { SecureKeyValueStore } from "@/platform/secureStorage";
import type { NetworkPort, OAuthBrowserPort } from "./auth";
import { SupabaseAuthRepository } from "./supabaseAuth";

class MemorySecureStore implements SecureKeyValueStore {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
    return Promise.resolve();
  }

  removeItem(key: string) {
    this.values.delete(key);
    return Promise.resolve();
  }

  clearNamespace() {
    this.values.clear();
    return Promise.resolve();
  }
}

function dependencies(connected: boolean) {
  const secure = new MemorySecureStore();
  const network: NetworkPort = {
    isConnected: () => Promise.resolve(connected),
  };
  const openedUrls: string[] = [];
  const browser: OAuthBrowserPort = {
    open: (url) => {
      openedUrls.push(url);
      return Promise.resolve();
    },
    close: () => Promise.resolve(),
  };
  return { secure, network, browser, openedUrls };
}

describe("SupabaseAuthRepository", () => {
  it("unlocks offline from a previously validated secure marker", async () => {
    const { secure, network, browser } = dependencies(false);
    await secure.setItem(
      "offline-session",
      JSON.stringify({
        userId: "user-a",
        email: "a@example.com",
        lastValidatedAt: "2026-07-22T03:00:00.000Z",
      }),
    );
    const client = {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: { session: null },
            error: new Error("offline"),
          }),
        ),
      },
    } as unknown as SupabaseClient;
    const repository = new SupabaseAuthRepository(
      client,
      secure,
      network,
      browser,
      "orosi://auth/callback",
    );

    await expect(repository.bootstrap()).resolves.toEqual({
      status: "signedIn",
      userId: "user-a",
      email: "a@example.com",
      offline: true,
      lastValidatedAt: "2026-07-22T03:00:00.000Z",
    });
  });

  it("rejects an offline local session without a previously validated secure marker", async () => {
    const { secure, network, browser } = dependencies(false);
    const client = {
      auth: {
        getSession: () =>
          Promise.resolve({
            data: {
              session: { user: { id: "user-a", email: "a@example.com" } },
            },
            error: null,
          }),
      },
    } as unknown as SupabaseClient;
    const repository = new SupabaseAuthRepository(
      client,
      secure,
      network,
      browser,
      "orosi://auth/callback",
    );

    await expect(repository.bootstrap()).resolves.toEqual({
      status: "signedOut",
      reason: "first-login-online",
    });
  });

  it("clears the offline marker when the server definitively rejects the session", async () => {
    const { secure, network, browser } = dependencies(true);
    await secure.setItem(
      "offline-session",
      JSON.stringify({
        userId: "user-a",
        email: null,
        lastValidatedAt: "2026-07-22T03:00:00.000Z",
      }),
    );
    const error = Object.assign(new Error("invalid refresh token"), {
      status: 401,
    });
    const client = {
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({ data: { session: null }, error }),
        ),
      },
    } as unknown as SupabaseClient;
    const repository = new SupabaseAuthRepository(
      client,
      secure,
      network,
      browser,
      "orosi://auth/callback",
    );

    await expect(repository.bootstrap()).resolves.toEqual({
      status: "signedOut",
      reason: "session-invalid",
    });
    await expect(secure.getItem("offline-session")).resolves.toBeNull();
  });

  it("requires connectivity before opening OAuth", async () => {
    const { secure, network, browser, openedUrls } = dependencies(false);
    const client = { auth: {} } as unknown as SupabaseClient;
    const repository = new SupabaseAuthRepository(
      client,
      secure,
      network,
      browser,
      "orosi://auth/callback",
    );

    await expect(repository.signIn("google")).rejects.toThrow(
      "처음 로그인에는 인터넷 연결이 필요해요.",
    );
    expect(openedUrls).toEqual([]);
  });
});
