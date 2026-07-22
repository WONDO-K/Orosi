import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PrivateNote } from "@/features/notes/note";
import {
  assertOwned,
  type NoteList,
  type PrivateNoteRepository,
} from "@/features/notes/noteRepository";
import type { LocalDatabaseFactory } from "./databaseFactory";

interface OrosiBrowserDb extends DBSchema {
  notes: {
    key: string;
    value: PrivateNote;
    indexes: {
      "by-updated-at": string;
      "by-deleted-at": string;
    };
  };
}

class IndexedDbNoteRepository implements PrivateNoteRepository {
  constructor(
    readonly ownerId: string,
    private readonly database: IDBPDatabase<OrosiBrowserDb>,
  ) {}

  async list(location: NoteList, query = ""): Promise<PrivateNote[]> {
    const normalized = query.trim().toLocaleLowerCase("ko-KR");
    const notes = (await this.database.getAll("notes"))
      .filter((note) =>
        location === "trash"
          ? note.deletedAt !== null
          : note.deletedAt === null,
      )
      .filter((note) => {
        if (!normalized) return true;
        return [note.title, note.derivedText, ...note.tags]
          .join(" ")
          .toLocaleLowerCase("ko-KR")
          .includes(normalized);
      });
    return notes.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async get(id: string): Promise<PrivateNote | null> {
    return (await this.database.get("notes", id)) ?? null;
  }

  async put(note: PrivateNote): Promise<void> {
    assertOwned(this, note);
    await this.database.put("notes", structuredClone(note));
  }

  async deletePermanently(id: string): Promise<void> {
    await this.database.delete("notes", id);
  }

  async purgeExpired(now: string): Promise<number> {
    const transaction = this.database.transaction("notes", "readwrite");
    const notes = await transaction.store.getAll();
    const expired = notes.filter(
      (note) => note.purgeAfter !== null && note.purgeAfter <= now,
    );
    await Promise.all(expired.map((note) => transaction.store.delete(note.id)));
    await transaction.done;
    return expired.length;
  }

  close(): Promise<void> {
    this.database.close();
    return Promise.resolve();
  }
}

export class IndexedDbDatabaseFactory implements LocalDatabaseFactory {
  constructor(private readonly prefix = "orosi") {}

  private name(ownerId: string): string {
    if (!ownerId)
      throw new Error("An account id is required to open local notes");
    return `${this.prefix}-notes-${ownerId}`;
  }

  async open(ownerId: string): Promise<PrivateNoteRepository> {
    const database = await openDB<OrosiBrowserDb>(this.name(ownerId), 1, {
      upgrade(db) {
        const store = db.createObjectStore("notes", { keyPath: "id" });
        store.createIndex("by-updated-at", "updatedAt");
        store.createIndex("by-deleted-at", "deletedAt");
      },
    });
    return new IndexedDbNoteRepository(ownerId, database);
  }

  async destroy(ownerId: string): Promise<void> {
    await deleteDB(this.name(ownerId));
  }
}
