import type { PrivateNote } from "./note";

export type NoteList = "active" | "trash";

export interface PrivateNoteRepository {
  readonly ownerId: string;
  list(location: NoteList, query?: string): Promise<PrivateNote[]>;
  get(id: string): Promise<PrivateNote | null>;
  put(note: PrivateNote): Promise<void>;
  deletePermanently(id: string): Promise<void>;
  purgeExpired(now: string): Promise<number>;
  close(): Promise<void>;
}

export function assertOwned(
  repository: PrivateNoteRepository,
  note: PrivateNote,
): void {
  if (repository.ownerId !== note.ownerId) {
    throw new Error("Cross-account local note access is forbidden");
  }
}
