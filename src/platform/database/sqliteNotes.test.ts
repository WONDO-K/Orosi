import { createPrivateNote } from "@/features/notes/note";
import type { SqlDriver } from "./sqliteDriver";
import { SqliteNoteRepository } from "./sqliteNotes";

class RecordingDriver implements SqlDriver {
  readonly calls: Array<{ statement: string; values: unknown[] }> = [];
  rows: Record<string, unknown>[] = [];
  changes = 0;

  execute() {
    return Promise.resolve();
  }

  run(statement: string, values: unknown[] = []) {
    this.calls.push({ statement, values });
    return Promise.resolve(this.changes);
  }

  query<T extends Record<string, unknown>>(
    statement: string,
    values: unknown[] = [],
  ) {
    this.calls.push({ statement, values });
    return Promise.resolve(this.rows as T[]);
  }

  close() {
    return Promise.resolve();
  }
}

describe("SqliteNoteRepository", () => {
  it("upserts an owned note as JSON without losing canonical fields", async () => {
    const driver = new RecordingDriver();
    const repository = new SqliteNoteRepository("user-a", driver);
    const note = createPrivateNote(
      "user-a",
      "2026-07-22T03:00:00.000Z",
      "note-a",
    );

    await repository.put(note);

    expect(driver.calls[0].statement).toContain("INSERT INTO notes");
    expect(driver.calls[0].values).toContain(JSON.stringify(note.document));
    expect(driver.calls[0].values).toContain("user-a");
  });

  it("maps SQLite rows and enforces the account predicate", async () => {
    const driver = new RecordingDriver();
    driver.rows = [
      {
        id: "note-a",
        owner_id: "user-a",
        title: "Note",
        document_json: '{"type":"doc","content":[{"type":"paragraph"}]}',
        derived_text: "",
        tags_json: "[]",
        created_at: "2026-07-22T03:00:00.000Z",
        updated_at: "2026-07-22T03:00:00.000Z",
        base_revision: 0,
        sync_state: "pending",
        deleted_at: null,
        purge_after: null,
      },
    ];
    const repository = new SqliteNoteRepository("user-a", driver);

    await expect(repository.list("active")).resolves.toMatchObject([
      { id: "note-a", ownerId: "user-a" },
    ]);
    expect(driver.calls[0].statement).toContain("owner_id = ?");
    expect(driver.calls[0].values[0]).toBe("user-a");
  });

  it("refuses a cross-account note before issuing SQL", async () => {
    const driver = new RecordingDriver();
    const repository = new SqliteNoteRepository("user-a", driver);

    await expect(
      repository.put(createPrivateNote("user-b", "2026-07-22T03:00:00.000Z")),
    ).rejects.toThrow("Cross-account local note access is forbidden");
    expect(driver.calls).toHaveLength(0);
  });
});
