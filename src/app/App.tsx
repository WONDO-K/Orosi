import { useState } from "react";
import { AuthGate } from "@/features/auth/AuthGate";
import { NotesScreen } from "@/features/notes/NotesScreen";
import type { AppDependencies } from "./dependencies";

type Tab = "notes" | "settings";

export function App({ dependencies }: { dependencies: AppDependencies }) {
  const [tab, setTab] = useState<Tab>("notes");

  async function logout(userId: string) {
    const confirmed = window.confirm(
      "동기화되지 않은 노트는 이 기기에서만 저장되어 있어요. 로그아웃할까요?",
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
              <NotesScreen
                key={session.userId}
                ownerId={session.userId}
                databases={dependencies.databases}
                now={() => dependencies.now()}
                newId={() => dependencies.newId()}
              />
            ) : (
              <div>
                <h1>설정</h1>
                <p>{session.email ?? "로그인된 계정"}</p>
                <button onClick={() => void logout(session.userId)}>
                  이 기기에서 로그아웃
                </button>
              </div>
            )}
          </section>
          <nav className="bottom-nav" aria-label="주요 메뉴">
            <button
              aria-current={tab === "notes" ? "page" : undefined}
              onClick={() => setTab("notes")}
            >
              내 노트
            </button>
            <button aria-disabled="true" disabled>
              둘러보기
            </button>
            <button
              aria-current={tab === "settings" ? "page" : undefined}
              onClick={() => setTab("settings")}
            >
              설정
            </button>
          </nav>
        </main>
      )}
    </AuthGate>
  );
}
