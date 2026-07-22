import { useState } from "react";
import type { OAuthProvider } from "./auth";
import type { PlatformKind } from "@/app/dependencies";

export function LoginScreen({
  platform,
  onSignIn,
}: {
  platform: PlatformKind;
  onSignIn: (provider: OAuthProvider) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(provider: OAuthProvider) {
    setBusy(true);
    setError(null);
    try {
      await onSignIn(provider);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "濡쒓렇?몄쓣 ?쒖옉?섏? 紐삵뻽?댁슂. ?ㅼ떆 ?쒕룄??二쇱꽭??",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <h1 id="auth-title" className="wordmark">
          orosi
        </h1>
        <p>?꾩슂??遺遺꾨쭔 媛?몄?, ??諛⑹떇?쇰줈 湲곗뼲?섏꽭??</p>
        <div className="auth-actions">
          <button disabled={busy} onClick={() => void start("google")}>
            Google濡?怨꾩냽?섍린
          </button>
          {platform === "ios" && (
            <button disabled={busy} onClick={() => void start("apple")}>
              Apple濡?怨꾩냽?섍린
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
        <p className="supporting-copy">
          泥섏쓬 濡쒓렇?명븷 ?뚮쭔 ?명꽣???곌껐???꾩슂?댁슂.
        </p>
      </section>
    </main>
  );
}
