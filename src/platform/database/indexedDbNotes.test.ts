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

  it("keeps recovery Markdown and assets after an editor restart", async () => {
    const repository = await factory.open(owners[0]);
    const note = createPrivateNote(
      owners[0],
      "2026-07-22T03:00:00.000Z",
      "recovery-note",
    );
    note.markdownDraft = "| 앞면 | 뒷면 |\n| --- | --- |\n| 질문 | 답 |";
    note.assets = [
      {
        id: "asset-a",
        uri: "data:image/png;base64,AA==",
        mimeType: "image/png",
        byteSize: 1,
        sha256: "a".repeat(64),
        width: 1,
        height: 1,
        createdAt: "2026-07-22T03:00:00.000Z",
      },
    ];
    await repository.put(note);
    await repository.close();

    const reopened = await factory.open(owners[0]);
    expect(await reopened.get("recovery-note")).toMatchObject({
      markdownDraft: note.markdownDraft,
      assets: note.assets,
    });
    await reopened.close();
  });

  it("searches a 1,000-note private library by title, text, and tag", async () => {
    const repository = await factory.open(owners[0]);
    await Promise.all(
      Array.from({ length: 1000 }, (_, index) => {
        const note = createPrivateNote(
          owners[0],
          `2026-07-22T03:${String(index % 60).padStart(2, "0")}:00.000Z`,
          `fixture-${index}`,
        );
        note.title = index === 512 ? "찾을 제목" : `노트 ${index}`;
        note.derivedText = index === 513 ? "찾을 본문" : "일반 본문";
        note.tags = index === 514 ? ["찾을태그"] : ["fixture"];
        return repository.put(note);
      }),
    );

    expect(
      (await repository.list("active", "찾을")).map((note) => note.id),
    ).toEqual(
      expect.arrayContaining(["fixture-512", "fixture-513", "fixture-514"]),
    );
    await repository.close();
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
