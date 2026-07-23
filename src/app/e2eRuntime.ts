import type {
  AuthRepository,
  AuthSnapshot,
  OAuthProvider,
} from "@/features/auth/auth";
import { IndexedDbDatabaseFactory } from "@/platform/database/indexedDbNotes";
import type { AppDependencies } from "./dependencies";

class E2eAuth implements AuthRepository {
  private readonly snapshot: AuthSnapshot = {
    status: "signedIn",
    userId: "e2e-user",
    email: "e2e@orosi.local",
    offline: false,
    lastValidatedAt: "2026-01-01T00:00:00.000Z",
  };
  current() {
    return this.snapshot;
  }
  bootstrap() {
    return Promise.resolve(this.snapshot);
  }
  signIn(provider: OAuthProvider) {
    void provider;
    return Promise.resolve();
  }
  completeOAuth() {
    return Promise.resolve(this.snapshot);
  }
  signOut() {
    return Promise.resolve();
  }
  subscribe() {
    return () => undefined;
  }
}

export function createE2eDependencies(): AppDependencies {
  return {
    auth: new E2eAuth(),
    databases: new IndexedDbDatabaseFactory("orosi-e2e"),
    platform: "web",
    now: () => "2026-01-01T00:00:00.000Z",
    newId: () => crypto.randomUUID(),
  };
}
