import type {
  AuthRepository,
  AuthSnapshot,
  OAuthProvider,
} from "@/features/auth/auth";

export class FakeAuthRepository implements AuthRepository {
  readonly signInCalls: OAuthProvider[] = [];
  signOutCalls = 0;
  private listeners = new Set<(snapshot: AuthSnapshot) => void>();

  constructor(private snapshot: AuthSnapshot) {}

  current() {
    return this.snapshot;
  }
  bootstrap() {
    return Promise.resolve(this.snapshot);
  }
  signIn(provider: OAuthProvider) {
    this.signInCalls.push(provider);
    return Promise.resolve();
  }
  completeOAuth() {
    return Promise.resolve(this.snapshot);
  }
  signOut() {
    this.signOutCalls += 1;
    this.emit({ status: "signedOut", reason: "first-login-online" });
    return Promise.resolve();
  }
  subscribe(listener: (snapshot: AuthSnapshot) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(snapshot: AuthSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
