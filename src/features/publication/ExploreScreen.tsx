import { useEffect, useState } from "react";
import { createPrivateNote, editPrivateNote } from "@/features/notes/note";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";
import {
  selectImportDocument,
  type ImportScope,
  type PublicSnapshot,
} from "./publication";
import type { PublicDiscovery } from "./supabasePublications";

export function ExploreScreen({
  ownerId,
  databases,
  discovery,
  now,
  newId,
}: {
  ownerId: string;
  databases: LocalDatabaseFactory;
  discovery?: PublicDiscovery;
  now: () => string;
  newId: () => string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicSnapshot[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => () => setResults([]), []);
  async function search() {
    if (!discovery) return;
    setResults(await discovery.search(query));
  }
  async function importSnapshot(result: PublicSnapshot, scope: ImportScope) {
    if (!discovery) return;
    try {
      const snapshot = await discovery.get(result.id, result.version);
      const repository = await databases.open(ownerId);
      const note = createPrivateNote(ownerId, now(), newId());
      await repository.put(
        editPrivateNote(note, {
          title: snapshot.title,
          document: selectImportDocument(snapshot, scope),
          tags: snapshot.tags,
          now: now(),
        }),
      );
      await repository.close();
      setMessage("개인 노트로 가져왔습니다.");
    } catch {
      setMessage("가져오지 못했습니다. 공개본이 사라졌을 수 있습니다.");
    }
  }
  return (
    <section aria-labelledby="explore-title">
      <h1 id="explore-title">탐색</h1>
      <label>
        공개 노트 검색
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button onClick={() => void search()} disabled={!discovery}>
        검색
      </button>
      {message && <p role="status">{message}</p>}
      <div className="note-list">
        {results.map((result) => (
          <article className="note-card" key={`${result.id}:${result.version}`}>
            <strong>{result.title}</strong>
            <span>{result.tags.join(", ")}</span>
            <p>{result.derivedText}</p>
            <button onClick={() => void importSnapshot(result, "note")}>
              전체 가져오기
            </button>
            <button onClick={() => void importSnapshot(result, "paragraph")}>
              문단 가져오기
            </button>
            <button onClick={() => void importSnapshot(result, "sentence")}>
              문장 가져오기
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
