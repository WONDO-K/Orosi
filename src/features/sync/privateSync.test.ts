import { createPrivateNote } from "@/features/notes/note";
import { IndexedDbDatabaseFactory } from "@/platform/database/indexedDbNotes";
import {
  PrivateSyncService,
  type PrivateSyncRemote,
  type RemoteSyncResult,
} from "./privateSync";

class FakeRemote implements PrivateSyncRemote {
  constructor(
    private readonly respond: (id: string) => Promise<RemoteSyncResult>,
    private readonly remoteNotes: ReturnType<typeof createPrivateNote>[] = [],
  ) {}

  pull() {
    return Promise.resolve(this.remoteNotes);
  }

  push({
    note,
  }: {
    ownerId: string;
    note: ReturnType<typeof createPrivateNote>;
    idempotencyKey: string;
  }) {
    return this.respond(note.id);
  }
}

describe("PrivateSyncService", () => {
  const owner = "sync-user";
  const factory = new IndexedDbDatabaseFactory("orosi-sync-test");

  afterEach(() => factory.destroy(owner));

  it("acknowledges pending notes with the returned server revision", async () => {
    const repository = await factory.open(owner);
    await repository.put(
      createPrivateNote(owner, "2026-07-23T00:00:00.000Z", "note-a"),
    );
    const service = new PrivateSyncService(
      new FakeRemote(() =>
        Promise.resolve({ status: "acknowledged", revision: 4 }),
      ),
      () => "operation-a",
      () => "2026-07-23T00:00:00.000Z",
    );

    await expect(service.sync(repository)).resolves.toMatchObject({
      pushed: 1,
    });
    await expect(repository.get("note-a")).resolves.toMatchObject({
      syncState: "synced",
      baseRevision: 4,
    });
    await repository.close();
  });

  it("preserves an unsent edit as a conflict copy", async () => {
    const repository = await factory.open(owner);
    const local = createPrivateNote(
      owner,
      "2026-07-23T00:00:00.000Z",
      "note-a",
    );
    local.title = "Local edit";
    const remote = {
      ...local,
      title: "Remote edit",
      baseRevision: 2,
      syncState: "synced" as const,
    };
    await repository.put(local);
    const service = new PrivateSyncService(
      new FakeRemote(() =>
        Promise.resolve({ status: "conflict", note: remote }),
      ),
      () => "conflict-copy",
      () => "2026-07-23T01:02:00.000Z",
    );

    const report = await service.sync(repository);
    expect(report.conflicts).toHaveLength(1);
    expect(await repository.get("note-a")).toMatchObject({
      title: "Remote edit",
      baseRevision: 2,
    });
    expect(await repository.get("conflict-copy")).toMatchObject({
      title: "Local edit (Conflict copy 2026-07-23 01:02)",
      syncState: "pending",
    });
    await repository.close();
  });

  it("keeps failed work local and eligible for retry", async () => {
    const repository = await factory.open(owner);
    await repository.put(
      createPrivateNote(owner, "2026-07-23T00:00:00.000Z", "note-a"),
    );
    const service = new PrivateSyncService(
      new FakeRemote(() => Promise.reject(new Error("offline"))),
      () => "operation-a",
      () => "2026-07-23T00:00:00.000Z",
    );

    await expect(service.sync(repository)).resolves.toMatchObject({
      failed: 1,
    });
    await expect(repository.get("note-a")).resolves.toMatchObject({
      syncState: "error",
    });
    await repository.close();
  });

  it("imports a newer remote revision without replacing a pending local edit", async () => {
    const repository = await factory.open(owner);
    const local = createPrivateNote(
      owner,
      "2026-07-23T00:00:00.000Z",
      "note-a",
    );
    local.title = "Local edit";
    await repository.put(local);
    const remote = {
      ...local,
      title: "Remote edit",
      baseRevision: 3,
      syncState: "synced" as const,
    };
    const service = new PrivateSyncService(
      new FakeRemote(
        () => Promise.resolve({ status: "acknowledged", revision: 3 }),
        [remote],
      ),
      () => "pulled-conflict",
      () => "2026-07-23T01:02:00.000Z",
    );

    const report = await service.sync(repository);
    expect(report.conflicts).toHaveLength(1);
    await expect(repository.get("note-a")).resolves.toMatchObject({
      title: "Remote edit",
    });
    await expect(repository.get("pulled-conflict")).resolves.toMatchObject({
      title: "Local edit (Conflict copy 2026-07-23 01:02)",
    });
    await repository.close();
  });
});
