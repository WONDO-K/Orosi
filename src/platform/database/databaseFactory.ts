import type { PrivateNoteRepository } from "@/features/notes/noteRepository";

export interface LocalDatabaseFactory {
  open(ownerId: string): Promise<PrivateNoteRepository>;
  destroy(ownerId: string): Promise<void>;
}
