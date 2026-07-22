import { useState } from "react";
import type { AppDependencies } from "./dependencies";
import { AuthGate } from "@/features/auth/AuthGate";

type Tab = "notes" | "settings";

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const [tab, setTab] = useState<Tab>("notes");

  async function logout(userId: string) {
    const confirmed = window.confirm(
      "?숆린?붾릺吏 ?딆? ?명듃????湲곌린?먯꽌 ??젣?????덉뼱?? 濡쒓렇?꾩썐?좉퉴??",
    );
    if (!confirmed) return;
    await dependencies.auth.signOut();
    await dependencies.databases.destroy(userId);
  }

  return (
    <AuthGate auth={dependencies.auth} platform={dependencies.platform}>
      {(session) => (
        <main className="app-shell">
          <header className="app-header">
            <span className="wordmark">orosi</span>
          </header>
          <section className="screen-content">
            {tab === "notes" ? (
              <div>
                <h1>???명듃</h1>
                <p>?섎쭔???붽린 ?ъ씤?몃? 湲곕줉??蹂댁꽭??</p>
              </div>
            ) : (
              <div>
                <h1>?ㅼ젙</h1>
                <p>{session.email ?? "濡쒓렇?몃맂 怨꾩젙"}</p>
                <button onClick={() => void logout(session.userId)}>
                  ??湲곌린?먯꽌 濡쒓렇?꾩썐
                </button>
              </div>
            )}
          </section>
          <nav className="bottom-nav" aria-label="二쇱슂 硫붾돱">
            <button
              aria-current={tab === "notes" ? "page" : undefined}
              onClick={() => setTab("notes")}
            >
              ???명듃
            </button>
            <button aria-disabled="true" disabled>
              ?섎윭蹂닿린
            </button>
            <button
              aria-current={tab === "settings" ? "page" : undefined}
              onClick={() => setTab("settings")}
            >
              ?ㅼ젙
            </button>
          </nav>
        </main>
      )}
    </AuthGate>
  );
}
