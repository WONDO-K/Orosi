import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

export interface PrivateNoteAsset {
  id: string;
  ownerId: string;
  noteId: string;
  uri: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  width: number | null;
  height: number | null;
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
    const [sha256, dimensions] = await Promise.all([
      sha256For(input.file),
      imageDimensions(uri),
    ]);
    return {
      id: input.id,
      ownerId: input.ownerId,
      noteId: input.noteId,
      uri,
      mimeType: input.file.type,
      byteSize: input.file.size,
      sha256,
      ...dimensions,
      createdAt: input.now,
    };
  }
}

export class CapacitorPrivateAssetStore implements PrivateAssetStore {
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

    const dataUri = await fileToDataUri(input.file);
    const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
    const extension = extensionFor(input.file.type);
    const path = `orosi/${encodeURIComponent(input.ownerId)}/${encodeURIComponent(input.noteId)}/${input.id}.${extension}`;
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });
    const [{ uri }, sha256, dimensions] = await Promise.all([
      Filesystem.getUri({ path, directory: Directory.Data }),
      sha256For(input.file),
      imageDimensions(dataUri),
    ]);
    return {
      id: input.id,
      ownerId: input.ownerId,
      noteId: input.noteId,
      uri: Capacitor.convertFileSrc(uri),
      mimeType: input.file.type,
      byteSize: input.file.size,
      sha256,
      ...dimensions,
      createdAt: input.now,
    };
  }
}

export function privateAssetStore(): PrivateAssetStore {
  return Capacitor.isNativePlatform()
    ? new CapacitorPrivateAssetStore()
    : new BrowserPrivateAssetStore();
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

async function sha256For(file: File): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function imageDimensions(
  uri: string,
): Promise<{ width: number | null; height: number | null }> {
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return Promise.resolve({ width: null, height: null });
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: null, height: null });
    image.src = uri;
  });
}

function extensionFor(mimeType: string): string {
  const extension = mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "");
  return extension || "image";
}
