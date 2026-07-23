import { createPrivateNote } from "@/features/notes/note";
import {
  createPublicSnapshot,
  provenanceFor,
  selectImportDocument,
} from "./publication";

describe("public snapshots and imports", () => {
  const note = createPrivateNote(
    "author-a",
    "2026-07-23T00:00:00.000Z",
    "note-a",
  );
  note.document = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { id: "block-a" },
        content: [{ type: "text", text: "First sentence. Second sentence." }],
      },
    ],
  };
  note.derivedText = "First sentence. Second sentence.";

  it("requires explicit reuse acceptance and caps public tags", () => {
    expect(() =>
      createPublicSnapshot({
        id: "publication-a",
        authorId: "author-a",
        note,
        title: "",
        tags: [],
        acceptedReuseTerms: true,
        now: "2026-07-23T00:00:00.000Z",
      }),
    ).toThrow("title");
    expect(() =>
      createPublicSnapshot({
        id: "publication-a",
        authorId: "author-a",
        note,
        title: "Public",
        tags: [],
        acceptedReuseTerms: false,
        now: "2026-07-23T00:00:00.000Z",
      }),
    ).toThrow("Reuse");
  });

  it("imports note, paragraph, and sentence scopes with provenance", () => {
    const snapshot = createPublicSnapshot({
      id: "publication-a",
      authorId: "author-a",
      note,
      title: "Public",
      tags: ["exam"],
      acceptedReuseTerms: true,
      now: "2026-07-23T00:00:00.000Z",
    });
    expect(selectImportDocument(snapshot, "note")).toEqual(note.document);
    expect(
      selectImportDocument(snapshot, "paragraph", "block-a").content,
    ).toHaveLength(1);
    const sentence = selectImportDocument(snapshot, "sentence", "block-a", 1);
    expect(sentence).toMatchObject({
      content: [{ content: [{ text: "Second sentence." }] }],
    });
    expect(
      provenanceFor({
        snapshot,
        scope: "sentence",
        document: sentence,
        now: "2026-07-23T01:00:00.000Z",
      }),
    ).toMatchObject({
      publicationId: "publication-a",
      scope: "sentence",
      destinationBlockIds: [],
    });
  });
});
