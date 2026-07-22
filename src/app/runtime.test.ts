import { vi } from "vitest";
import { FakeAuthRepository } from "@/test/fakeAuth";
import type { AppDependencies } from "./dependencies";

const capacitorApp = vi.hoisted(() => {
  let listener: ((event: { url: string }) => void) | undefined;
  const addListener = vi.fn(
    (_event: "appUrlOpen", nextListener: (event: { url: string }) => void) => {
      listener = nextListener;
      return Promise.resolve({ remove: vi.fn(() => Promise.resolve()) });
    },
  );

  return {
    addListener,
    emit(url: string) {
      listener?.({ url });
    },
    reset() {
      listener = undefined;
      addListener.mockClear();
    },
  };
});

vi.mock("@capacitor/app", () => ({ App: capacitorApp }));

import { attachOAuthCallback } from "./runtime";

function dependencies() {
  const auth = new FakeAuthRepository({ status: "signedOut" });
  const completeOAuth = vi.spyOn(auth, "completeOAuth");
  const runtimeDependencies: AppDependencies = {
    auth,
    databases: {} as AppDependencies["databases"],
    platform: "web",
    now: () => "2026-07-22T03:00:00.000Z",
    newId: () => "test-id",
  };
  return {
    dependencies: runtimeDependencies,
    completeOAuth,
  };
}

describe("attachOAuthCallback", () => {
  beforeEach(() => capacitorApp.reset());

  it("completes OAuth for the canonical callback URL", async () => {
    const { dependencies: runtimeDependencies, completeOAuth } = dependencies();
    await attachOAuthCallback(runtimeDependencies);

    capacitorApp.emit("orosi://auth/callback?code=valid-code");

    expect(completeOAuth).toHaveBeenCalledWith(
      "orosi://auth/callback?code=valid-code",
    );
  });

  it("ignores malformed and near-match callback URLs", async () => {
    const { dependencies: runtimeDependencies, completeOAuth } = dependencies();
    await attachOAuthCallback(runtimeDependencies);

    expect(() => {
      capacitorApp.emit("orosi://auth/callback.evil?code=attacker-code");
      capacitorApp.emit("orosi://auth/callback/extra?code=attacker-code");
      capacitorApp.emit("orosi://auth:8443/callback?code=attacker-code");
      capacitorApp.emit("orosi://user@auth/callback?code=attacker-code");
      capacitorApp.emit("not a valid URL");
    }).not.toThrow();

    expect(completeOAuth).not.toHaveBeenCalled();
  });
});
