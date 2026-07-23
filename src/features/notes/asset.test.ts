import { BrowserPrivateAssetStore } from "./asset";

describe("BrowserPrivateAssetStore", () => {
  it("copies an image into application-owned data", async () => {
    const store = new BrowserPrivateAssetStore();
    const asset = await store.copy({
      ownerId: "user-a",
      noteId: "note-a",
      file: new File(["image-data"], "diagram.png", { type: "image/png" }),
      id: "asset-a",
      now: "2026-07-23T00:00:00.000Z",
    });

    expect(asset).toMatchObject({
      id: "asset-a",
      ownerId: "user-a",
      noteId: "note-a",
      mimeType: "image/png",
      byteSize: 10,
    });
    expect(asset.uri).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects a non-image before copying it", async () => {
    const store = new BrowserPrivateAssetStore();
    await expect(
      store.copy({
        ownerId: "user-a",
        noteId: "note-a",
        file: new File(["text"], "note.txt", { type: "text/plain" }),
        id: "asset-a",
        now: "2026-07-23T00:00:00.000Z",
      }),
    ).rejects.toThrow("Only image assets");
  });
});
