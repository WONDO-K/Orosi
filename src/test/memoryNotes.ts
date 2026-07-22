import type { PrivateNote } from "@/features/notes/note";
import {
  assertOwned,
  type NoteList,
  type PrivateNoteRepository,
} from "@/features/notes/noteRepository";
import type { LocalDatabaseFactory } from "@/platform/database/databaseFactory";

class MemoryNoteRepository implements PrivateNoteRepository {
  constructor(
    readonly ownerId: string,
    private readonly notes: Map<string, PrivateNote>,
  ) {}

  list(location: NoteList, query = "") {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    return Promise.resolve(
      [...this.notes.values()]
        .filter((note) =>
          location === "trash"
            ? note.deletedAt !== null
            : note.deletedAt === null,
        )
        .filter(
          (note) =>
            !normalized ||
            [note.title, note.derivedText, ...note.tags]
              .join(" ")
              .toLocaleLowerCase("ko-KR")
              .includes(normalized),
        )
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((note) => structuredClone(note)),
    );
  }

  get(id: string) {
    return Promise.resolve(structuredClone(this.notes.get(id) ?? null));
  }

  put(note: PrivateNote) {
    assertOwned(this, note);
    this.notes.set(note.id, structuredClone(note));
    return Promise.resolve();
  }

  deletePermanently(id: string) {
    this.notes.delete(id);
    return Promise.resolve();
  }

  purgeExpired(now: string) {
    const expired = [...this.notes.values()].filter(
      (note) => note.purgeAfter && note.purgeAfter <= now,
    );
    expired.forEach((note) => this.notes.delete(note.id));
    return Promise.resolve(expired.length);
  }

  close() {
    return Promise.resolve();
  }
}

export class MemoryDatabaseFactory implements LocalDatabaseFactory {
  private readonly accounts = new Map<string, Map<string, PrivateNote>>();

  open(ownerId: string): Promise<PrivateNoteRepository> {
    const notes = this.accounts.get(ownerId) ?? new Map<string, PrivateNote>();
    this.accounts.set(ownerId, notes);
    return Promise.resolve(new MemoryNoteRepository(ownerId, notes));
  }

  destroy(ownerId: string) {
    this.accounts.delete(ownerId);
    return Promise.resolve();
  }
}
