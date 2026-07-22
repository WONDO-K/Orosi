export type OAuthProvider = "google" | "apple";

export type AuthSnapshot =
  | { status: "checking" }
  | { status: "signedOut"; reason?: "first-login-online" | "session-invalid" }
  | {
      status: "signedIn";
      userId: string;
      email: string | null;
      offline: boolean;
      lastValidatedAt: string;
    };

export interface AuthRepository {
  bootstrap(): Promise<AuthSnapshot>;
  signIn(provider: OAuthProvider): Promise<void>;
  completeOAuth(callbackUrl: string): Promise<AuthSnapshot>;
  signOut(): Promise<void>;
  current(): AuthSnapshot;
  subscribe(listener: (snapshot: AuthSnapshot) => void): () => void;
}

export interface NetworkPort {
  isConnected(): Promise<boolean>;
}

export interface OAuthBrowserPort {
  open(url: string): Promise<void>;
  close(): Promise<void>;
}
