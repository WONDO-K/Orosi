export interface PrivateNoteAsset {
  id: string;
  ownerId: string;
  noteId: string;
  uri: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
}

export interface PrivateAssetStore {
  copy(input: {
    ownerId: string;
    noteId: string;
    file: File;
    id: string;
    now: string;
  }): Promise<PrivateNoteAsset>;
}

export class BrowserPrivateAssetStore implements PrivateAssetStore {
  async copy(input: {
    ownerId: string;
    noteId: string;
    file: File;
    id: string;
    now: string;
  }): Promise<PrivateNoteAsset> {
    if (!input.file.type.startsWith("image/")) {
      throw new Error("Only image assets can be added to a note");
    }

    const uri = await fileToDataUri(input.file);
    return {
      id: input.id,
      ownerId: input.ownerId,
      noteId: input.noteId,
      uri,
      mimeType: input.file.type,
      byteSize: input.file.size,
      createdAt: input.now,
    };
  }
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not copy image"));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not copy image"));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
