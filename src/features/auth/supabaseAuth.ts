import { Browser } from "@capacitor/browser";
import { Network } from "@capacitor/network";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { z } from "zod";
import {
  CapacitorSecureKeyValueStore,
  type SecureKeyValueStore,
} from "@/platform/secureStorage";
import type {
  AuthRepository,
  AuthSnapshot,
  NetworkPort,
  OAuthBrowserPort,
  OAuthProvider,
} from "./auth";

const MARKER_KEY = "offline-session";

interface OfflineMarker {
  userId: string;
  email: string | null;
  lastValidatedAt: string;
}

const environmentSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_AUTH_REDIRECT_URL: z.string().startsWith("orosi://"),
});

function fromSession(
  session: Session,
  offline: boolean,
  validatedAt: string,
): AuthSnapshot {
  return {
    status: "signedIn",
    userId: session.user.id,
    email: session.user.email ?? null,
    offline,
    lastValidatedAt: validatedAt,
  };
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error))
    return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

export class SupabaseAuthRepository implements AuthRepository {
  private snapshot: AuthSnapshot = { status: "checking" };
  private readonly listeners = new Set<(snapshot: AuthSnapshot) => void>();

  constructor(
    private readonly client: SupabaseClient,
    private readonly secure: SecureKeyValueStore,
    private readonly network: NetworkPort,
    private readonly browser: OAuthBrowserPort,
    private readonly redirectUrl: string,
  ) {}

  current(): AuthSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: AuthSnapshot): AuthSnapshot {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }

  private async readMarker(): Promise<OfflineMarker | null> {
    const value = await this.secure.getItem(MARKER_KEY);
    if (!value) return null;

    try {
      const marker = JSON.parse(value) as OfflineMarker;
      return marker.userId && marker.lastValidatedAt ? marker : null;
    } catch {
      await this.secure.removeItem(MARKER_KEY);
      return null;
    }
  }

  private async remember(session: Session, validatedAt: string): Promise<void> {
    const marker: OfflineMarker = {
      userId: session.user.id,
      email: session.user.email ?? null,
      lastValidatedAt: validatedAt,
    };
    await this.secure.setItem(MARKER_KEY, JSON.stringify(marker));
  }

  async bootstrap(): Promise<AuthSnapshot> {
    const connected = await this.network.isConnected();
    const marker = await this.readMarker();
    const { data, error } = await this.client.auth.getSession();

    if (data.session) {
      const validatedAt = connected
        ? new Date().toISOString()
        : (marker?.lastValidatedAt ?? new Date().toISOString());
      if (connected) await this.remember(data.session, validatedAt);
      return this.publish(fromSession(data.session, !connected, validatedAt));
    }

    const status = statusOf(error);
    if (connected && (status === 400 || status === 401 || status === 403)) {
      await this.secure.removeItem(MARKER_KEY);
      return this.publish({ status: "signedOut", reason: "session-invalid" });
    }

    if (marker) {
      return this.publish({ status: "signedIn", ...marker, offline: true });
    }

    return this.publish({ status: "signedOut", reason: "first-login-online" });
  }

  async signIn(provider: OAuthProvider): Promise<void> {
    if (!(await this.network.isConnected())) {
      throw new Error("처음 로그인에는 인터넷 연결이 필요해요.");
    }

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: this.redirectUrl, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url)
      throw new Error("로그인 주소를 찾을 수 없어 다시 시도해 주세요.");
    await this.browser.open(data.url);
  }

  async completeOAuth(callbackUrl: string): Promise<AuthSnapshot> {
    const code = new URL(callbackUrl).searchParams.get("code");
    if (!code) throw new Error("로그인 응답에 인증 코드가 없어요.");

    const { data, error } = await this.client.auth.exchangeCodeForSession(code);
    await this.browser.close();
    if (error) throw error;

    const validatedAt = new Date().toISOString();
    await this.remember(data.session, validatedAt);
    return this.publish(fromSession(data.session, false, validatedAt));
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut({ scope: "local" });
    if (error) throw error;
    await this.secure.removeItem(MARKER_KEY);
    this.publish({ status: "signedOut", reason: "first-login-online" });
  }
}

export function createSupabaseAuthRepository(
  environment: Record<string, unknown>,
): AuthRepository {
  const config = environmentSchema.parse(environment);
  const secure = new CapacitorSecureKeyValueStore();
  const client = createClient(
    config.VITE_SUPABASE_URL,
    config.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storage: secure,
      },
    },
  );
  const network: NetworkPort = {
    isConnected: async () => (await Network.getStatus()).connected,
  };
  const browser: OAuthBrowserPort = {
    open: (url) => Browser.open({ url }),
    close: () => Browser.close(),
  };
  return new SupabaseAuthRepository(
    client,
    secure,
    network,
    browser,
    config.VITE_AUTH_REDIRECT_URL,
  );
}
