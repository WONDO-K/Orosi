import type {
  NoteDocument,
  NoteSyncState,
  PrivateNote,
} from "@/features/notes/note";
import {
  assertOwned,
  type NoteList,
  type PrivateNoteRepository,
} from "@/features/notes/noteRepository";
import type { SqlDriver } from "./sqliteDriver";

interface NoteRow extends Record<string, unknown> {
  id: string;
  owner_id: string;
  title: string;
  document_json: string;
  derived_text: string;
  tags_json: string;
  created_at: string;
  updated_at: string;
  base_revision: number;
  sync_state: NoteSyncState;
  deleted_at: string | null;
  purge_after: string | null;
}

function fromRow(row: NoteRow): PrivateNote {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    document: JSON.parse(row.document_json) as NoteDocument,
    derivedText: row.derived_text,
    tags: JSON.parse(row.tags_json) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    baseRevision: row.base_revision,
    syncState: row.sync_state,
    deletedAt: row.deleted_at,
    purgeAfter: row.purge_after,
  };
}

export class SqliteNoteRepository implements PrivateNoteRepository {
  constructor(
    readonly ownerId: string,
    private readonly driver: SqlDriver,
  ) {}

  async list(location: NoteList, query = ""): Promise<PrivateNote[]> {
    const deletedPredicate =
      location === "trash" ? "deleted_at IS NOT NULL" : "deleted_at IS NULL";
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    const searchPredicate = normalized
      ? "AND LOWER(title || ' ' || derived_text || ' ' || tags_json) LIKE ?"
      : "";
    const values: unknown[] = [this.ownerId];
    if (normalized) values.push(`%${normalized}%`);
    const rows = await this.driver.query<NoteRow>(
      `SELECT * FROM notes WHERE owner_id = ? AND ${deletedPredicate} ${searchPredicate} ORDER BY updated_at DESC`,
      values,
    );
    return rows.map(fromRow);
  }

  async get(id: string): Promise<PrivateNote | null> {
    const rows = await this.driver.query<NoteRow>(
      "SELECT * FROM notes WHERE owner_id = ? AND id = ? LIMIT 1",
      [this.ownerId, id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  }

  async put(note: PrivateNote): Promise<void> {
    assertOwned(this, note);
    await this.driver.run(
      `INSERT INTO notes (
        id, owner_id, title, document_json, derived_text, tags_json, created_at,
        updated_at, base_revision, sync_state, deleted_at, purge_after
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        document_json = excluded.document_json,
        derived_text = excluded.derived_text,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at,
        base_revision = excluded.base_revision,
        sync_state = excluded.sync_state,
        deleted_at = excluded.deleted_at,
        purge_after = excluded.purge_after
      WHERE notes.owner_id = excluded.owner_id`,
      [
        note.id,
        note.ownerId,
        note.title,
        JSON.stringify(note.document),
        note.derivedText,
        JSON.stringify(note.tags),
        note.createdAt,
        note.updatedAt,
        note.baseRevision,
        note.syncState,
        note.deletedAt,
        note.purgeAfter,
      ],
    );
  }

  async deletePermanently(id: string): Promise<void> {
    await this.driver.run("DELETE FROM notes WHERE owner_id = ? AND id = ?", [
      this.ownerId,
      id,
    ]);
  }

  async purgeExpired(now: string): Promise<number> {
    return this.driver.run(
      "DELETE FROM notes WHERE owner_id = ? AND purge_after IS NOT NULL AND purge_after <= ?",
      [this.ownerId, now],
    );
  }

  async close(): Promise<void> {
    await this.driver.close();
  }
}
