import type { PrivateNote } from "@/features/notes/note";
import { createConflictCopy } from "@/features/notes/note";
import type { PrivateNoteRepository } from "@/features/notes/noteRepository";

export type RemoteSyncResult =
  | { status: "acknowledged"; revision: number }
  | { status: "conflict"; note: PrivateNote };

export interface PrivateSyncRemote {
  pull(ownerId: string): Promise<PrivateNote[]>;
  push(input: {
    ownerId: string;
    note: PrivateNote;
    idempotencyKey: string;
  }): Promise<RemoteSyncResult>;
}

export interface SyncReport {
  pushed: number;
  conflicts: PrivateNote[];
  failed: number;
}

export class PrivateSyncService {
  constructor(
    private readonly remote: PrivateSyncRemote,
    private readonly newId: () => string,
    private readonly now: () => string,
  ) {}

  async sync(repository: PrivateNoteRepository): Promise<SyncReport> {
    const report: SyncReport = { pushed: 0, conflicts: [], failed: 0 };
    try {
      for (const remoteNote of await this.remote.pull(repository.ownerId)) {
        const local = await repository.get(remoteNote.id);
        if (!local) {
          await repository.put({ ...remoteNote, syncState: "synced" });
          continue;
        }
        if (remoteNote.baseRevision <= local.baseRevision) continue;
        if (local.syncState !== "synced") {
          const copy = createConflictCopy(local, this.now(), this.newId());
          await repository.put(copy);
          report.conflicts.push(copy);
        }
        await repository.put({ ...remoteNote, syncState: "synced" });
      }
    } catch {
      report.failed += 1;
    }
    const candidates = [
      ...(await repository.list("active")),
      ...(await repository.list("trash")),
    ].filter((note) => note.syncState !== "synced");
    for (const note of candidates) {
      try {
        const result = await this.remote.push({
          ownerId: repository.ownerId,
          note,
          idempotencyKey: this.newId(),
        });
        if (result.status === "acknowledged") {
          await repository.put({
            ...note,
            baseRevision: result.revision,
            syncState: "synced",
          });
          report.pushed += 1;
          continue;
        }

        const copy = createConflictCopy(note, this.now(), this.newId());
        await repository.put(copy);
        await repository.put({ ...result.note, syncState: "synced" });
        report.conflicts.push(copy);
      } catch {
        await repository.put({ ...note, syncState: "error" });
        report.failed += 1;
      }
    }
    return report;
  }
}
