import { useCallback, useEffect, useState } from "react";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";
import {
  createPrivateNote,
  moveToTrash,
  restoreFromTrash,
  type PrivateNote,
} from "./note";
import type { NoteList, PrivateNoteRepository } from "./noteRepository";
import { NoteEditorScreen } from "./NoteEditorScreen";
import type { PrivateSyncService } from "@/features/sync/privateSync";

export function NotesScreen({
  ownerId,
  databases,
  now,
  newId,
  sync,
}: {
  ownerId: string;
  databases: LocalDatabaseFactory;
  now: () => string;
  newId: () => string;
  sync?: PrivateSyncService;
}) {
  const [repository, setRepository] = useState<PrivateNoteRepository | null>(
    null,
  );
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [location, setLocation] = useState<NoteList>("active");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PrivateNote | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refresh = useCallback(
    async (repo: PrivateNoteRepository, list = location, search = query) => {
      setNotes(await repo.list(list, search));
    },
    [location, query],
  );

  useEffect(() => {
    let open = true;
    let current: PrivateNoteRepository | null = null;
    void databases.open(ownerId).then(async (repo) => {
      current = repo;
      if (!open) {
        await repo.close();
        return;
      }
      await repo.purgeExpired(now());
      if (open) {
        setRepository(repo);
        setNotes(await repo.list("active", ""));
      }
    });
    return () => {
      open = false;
      if (current) void current.close();
    };
  }, [databases, now, ownerId]);

  useEffect(() => {
    if (!repository || !sync) return;
    const run = () =>
      void sync.sync(repository).then(() => refresh(repository));
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };
    run();
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, repository, sync]);

  async function create() {
    if (!repository) return;
    const note = createPrivateNote(ownerId, now(), newId());
    await repository.put(note);
    setSelected(note);
  }

  async function save(note: PrivateNote) {
    if (!repository) throw new Error("Local notes are not ready");
    await repository.put(note);
    setSelected(note);
  }

  async function trash(note: PrivateNote) {
    if (!repository) return;
    await repository.put(moveToTrash(note, now()));
    await refresh(repository);
  }

  async function restore(note: PrivateNote) {
    if (!repository) return;
    await repository.put(restoreFromTrash(note, now()));
    await refresh(repository);
  }

  async function permanentlyDelete(note: PrivateNote) {
    if (
      !repository ||
      !window.confirm("이 노트는 복구할 수 없어요. 영구 삭제할까요?")
    )
      return;
    await repository.deletePermanently(note.id);
    await refresh(repository);
  }

  async function changeLocation(next: NoteList) {
    if (!repository) return;
    setLocation(next);
    await refresh(repository, next, query);
  }

  async function search(next: string) {
    setQuery(next);
    if (repository) await refresh(repository, location, next);
  }

  async function synchronize() {
    if (!repository || !sync || syncing) return;
    setSyncing(true);
    try {
      const report = await sync.sync(repository);
      await refresh(repository);
      setSyncMessage(
        report.conflicts.length
          ? `동기화 충돌 ${report.conflicts.length}건: 충돌 사본을 만들었습니다.`
          : report.failed
            ? `동기화 실패 ${report.failed}건: 기기에 보관하고 다시 시도합니다.`
            : `${report.pushed}개 노트를 동기화했습니다.`,
      );
    } finally {
      setSyncing(false);
    }
  }

  if (selected) {
    return (
      <NoteEditorScreen
        note={selected}
        now={now}
        onSave={save}
        onClose={() => {
          setSelected(null);
          if (repository) void refresh(repository);
        }}
      />
    );
  }

  return (
    <section aria-labelledby="notes-title">
      <div className="notes-heading">
        <h1 id="notes-title">{location === "active" ? "내 노트" : "휴지통"}</h1>
        {location === "active" && (
          <button onClick={() => void create()} disabled={!repository}>
            새 노트
          </button>
        )}
        <button
          onClick={() => void synchronize()}
          disabled={!repository || !sync || syncing}
        >
          {syncing ? "동기화 중" : "동기화"}
        </button>
      </div>
      {syncMessage && <p role="status">{syncMessage}</p>}
      <div className="notes-filters">
        <button
          aria-pressed={location === "active"}
          onClick={() => void changeLocation("active")}
        >
          노트 보기
        </button>
        <button
          aria-pressed={location === "trash"}
          onClick={() => void changeLocation("trash")}
        >
          휴지통 보기
        </button>
      </div>
      <label className="search-field">
        노트 검색
        <input
          type="search"
          value={query}
          onChange={(event) => void search(event.target.value)}
        />
      </label>
      <div className="note-list">
        {notes.map((note) => (
          <article key={note.id} className="note-card" aria-label={note.title}>
            <button
              className="note-open"
              aria-label={`${note.title} 열기`}
              onClick={() => setSelected(note)}
            >
              <strong>{note.title}</strong>
              <span>{note.derivedText || "내용을 적어 보세요"}</span>
            </button>
            {location === "active" ? (
              <button onClick={() => void trash(note)}>휴지통으로 이동</button>
            ) : (
              <div>
                <button onClick={() => void restore(note)}>복원</button>
                <button onClick={() => void permanentlyDelete(note)}>
                  영구 삭제
                </button>
              </div>
            )}
          </article>
        ))}
        {repository && notes.length === 0 && <p>여기에 표시할 노트가 없어요</p>}
      </div>
    </section>
  );
}
