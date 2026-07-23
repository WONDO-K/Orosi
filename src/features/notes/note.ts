import type { JSONContent } from "@tiptap/core";

export type NoteDocument = JSONContent & { type: "doc" };
export type NoteSyncState = "pending" | "synced" | "error";

export interface PrivateNote {
  id: string;
  ownerId: string;
  title: string;
  document: NoteDocument;
  derivedText: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  baseRevision: number;
  syncState: NoteSyncState;
  deletedAt: string | null;
  purgeAfter: string | null;
}

export const EMPTY_DOCUMENT: NoteDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function createPrivateNote(
  ownerId: string,
  now: string,
  id: string = crypto.randomUUID(),
): PrivateNote {
  if (!ownerId) throw new Error("A private note requires an owner");

  return {
    id,
    ownerId,
    title: "제목 없는 노트",
    document: structuredClone(EMPTY_DOCUMENT),
    derivedText: "",
    tags: [],
    createdAt: now,
    updatedAt: now,
    baseRevision: 0,
    syncState: "pending",
    deletedAt: null,
    purgeAfter: null,
  };
}

export function derivePlainText(node: JSONContent): string {
  const own = typeof node.text === "string" ? node.text : "";
  const children = node.content?.map(derivePlainText).filter(Boolean) ?? [];
  return [own, ...children]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function editPrivateNote(
  note: PrivateNote,
  change: {
    title: string;
    document: NoteDocument;
    tags?: string[];
    now: string;
  },
): PrivateNote {
  if (note.deletedAt) throw new Error("Restore a trashed note before editing");

  return {
    ...note,
    title: change.title.trim() || "제목 없는 노트",
    document: structuredClone(change.document),
    tags: change.tags ? [...new Set(change.tags)] : note.tags,
    derivedText: derivePlainText(change.document),
    updatedAt: change.now,
    syncState: "pending",
  };
}

export function moveToTrash(note: PrivateNote, now: string): PrivateNote {
  const purgeAfter = new Date(now);
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + 30);
  return {
    ...note,
    deletedAt: now,
    purgeAfter: purgeAfter.toISOString(),
    updatedAt: now,
    syncState: "pending",
  };
}

export function restoreFromTrash(note: PrivateNote, now: string): PrivateNote {
  if (!note.deletedAt) return note;
  return {
    ...note,
    deletedAt: null,
    purgeAfter: null,
    updatedAt: now,
    syncState: "pending",
  };
}
