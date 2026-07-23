import {
  createPrivateNote,
  editPrivateNote,
  moveToTrash,
  restoreFromTrash,
} from "./note";

const NOW = "2026-07-22T03:00:00.000Z";

describe("private note lifecycle", () => {
  it("creates a private, pending-sync Tiptap document", () => {
    const note = createPrivateNote("user-a", NOW, "note-a");

    expect(note).toMatchObject({
      id: "note-a",
      ownerId: "user-a",
      title: "제목 없는 노트",
      document: { type: "doc", content: [{ type: "paragraph" }] },
      derivedText: "",
      tags: [],
      baseRevision: 0,
      syncState: "pending",
      deletedAt: null,
      purgeAfter: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("derives searchable text and updates only the edited copy", () => {
    const original = createPrivateNote("user-a", NOW, "note-a");
    const edited = editPrivateNote(original, {
      title: "한국어",
      document: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "정확한 뜻" }] },
        ],
      },
      now: "2026-07-22T03:01:00.000Z",
    });

    expect(edited.derivedText).toBe("정확한 뜻");
    expect(edited.updatedAt).toBe("2026-07-22T03:01:00.000Z");
    expect(original.title).toBe("제목 없는 노트");
  });

  it("sets a 30-day purge date and clears it on restore", () => {
    const note = createPrivateNote("user-a", NOW, "note-a");
    const trashed = moveToTrash(note, NOW);
    const restored = restoreFromTrash(trashed, "2026-07-23T03:00:00.000Z");

    expect(trashed.deletedAt).toBe(NOW);
    expect(trashed.purgeAfter).toBe("2026-08-21T03:00:00.000Z");
    expect(restored.deletedAt).toBeNull();
    expect(restored.purgeAfter).toBeNull();
  });

  it("keeps distinct edited tags with the local note", () => {
    const note = createPrivateNote("user-a", NOW, "note-a");
    const edited = editPrivateNote(note, {
      title: "Tags",
      document: note.document,
      tags: ["biology", "biology", "exam"],
      now: "2026-07-22T03:01:00.000Z",
    });

    expect(edited.tags).toEqual(["biology", "exam"]);
  });
});
