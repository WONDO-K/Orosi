import { createPrivateNote, moveToTrash } from "@/features/notes/note";
import { IndexedDbDatabaseFactory } from "./indexedDbNotes";

describe("IndexedDbDatabaseFactory", () => {
  const owners = ["idb-user-a", "idb-user-b"];
  const factory = new IndexedDbDatabaseFactory("orosi-test");

  afterEach(async () => {
    await Promise.all(owners.map((owner) => factory.destroy(owner)));
  });

  it("persists after close/reopen and isolates accounts", async () => {
    const first = await factory.open(owners[0]);
    await first.put(
      createPrivateNote(owners[0], "2026-07-22T03:00:00.000Z", "note-a"),
    );
    await first.close();

    const reopened = await factory.open(owners[0]);
    const other = await factory.open(owners[1]);

    expect(await reopened.get("note-a")).toMatchObject({ ownerId: owners[0] });
    expect(await other.get("note-a")).toBeNull();
    await reopened.close();
    await other.close();
  });

  it("separates active and trash lists and purges only expired notes", async () => {
    const repository = await factory.open(owners[0]);
    const active = createPrivateNote(
      owners[0],
      "2026-07-01T00:00:00.000Z",
      "active",
    );
    const trashed = moveToTrash(
      createPrivateNote(owners[0], "2026-06-01T00:00:00.000Z", "trashed"),
      "2026-06-01T00:00:00.000Z",
    );
    await repository.put(active);
    await repository.put(trashed);

    expect((await repository.list("active")).map((note) => note.id)).toEqual([
      "active",
    ]);
    expect((await repository.list("trash")).map((note) => note.id)).toEqual([
      "trashed",
    ]);
    expect(await repository.purgeExpired("2026-07-02T00:00:00.000Z")).toBe(1);
    expect(await repository.get("trashed")).toBeNull();
    await repository.close();
  });
});
