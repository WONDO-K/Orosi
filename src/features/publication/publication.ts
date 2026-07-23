import type { JSONContent } from "@tiptap/core";
import type { NoteDocument, PrivateNote } from "@/features/notes/note";

export type ImportScope = "note" | "paragraph" | "sentence";

export interface PublicSnapshot {
  id: string;
  version: number;
  authorId: string;
  title: string;
  document: NoteDocument;
  derivedText: string;
  tags: string[];
  digest: string;
  publishedAt: string;
}

export interface ProvenanceLink {
  publicationId: string;
  version: number;
  authorId: string;
  scope: ImportScope;
  digest: string;
  destinationBlockIds: string[];
  importedAt: string;
}

export function createPublicSnapshot(input: {
  id: string;
  authorId: string;
  note: PrivateNote;
  title: string;
  tags: string[];
  acceptedReuseTerms: boolean;
  now: string;
  version?: number;
}): PublicSnapshot {
  const title = input.title.trim();
  const tags = [
    ...new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)),
  ];
  if (!title) throw new Error("A public note needs a title");
  if (tags.length > 10)
    throw new Error("A public note can have at most 10 tags");
  if (!input.acceptedReuseTerms)
    throw new Error("Reuse terms must be accepted");
  const document = structuredClone(input.note.document);
  const derivedText = input.note.derivedText;
  return {
    id: input.id,
    version: input.version ?? 1,
    authorId: input.authorId,
    title,
    document,
    derivedText,
    tags,
    digest: digestFor(document),
    publishedAt: input.now,
  };
}

export function selectImportDocument(
  snapshot: PublicSnapshot,
  scope: ImportScope,
  blockId?: string,
  sentenceIndex?: number,
): NoteDocument {
  if (scope === "note") return structuredClone(snapshot.document);
  const block = findBlock(snapshot.document, blockId);
  if (!block) throw new Error("Selected public block is unavailable");
  if (scope === "paragraph")
    return { type: "doc", content: [structuredClone(block)] };
  const text = plainText(block)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)[sentenceIndex ?? 0];
  if (!text) throw new Error("Selected sentence is unavailable");
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

export function provenanceFor(input: {
  snapshot: PublicSnapshot;
  scope: ImportScope;
  document: NoteDocument;
  now: string;
}): ProvenanceLink {
  return {
    publicationId: input.snapshot.id,
    version: input.snapshot.version,
    authorId: input.snapshot.authorId,
    scope: input.scope,
    digest: input.snapshot.digest,
    destinationBlockIds: collectBlockIds(input.document),
    importedAt: input.now,
  };
}

function findBlock(node: JSONContent, id?: string): JSONContent | null {
  if (node.attrs?.id === id) return node;
  for (const child of node.content ?? []) {
    const found = findBlock(child, id);
    if (found) return found;
  }
  return null;
}
function plainText(node: JSONContent): string {
  return [node.text, ...(node.content ?? []).map(plainText)]
    .filter(Boolean)
    .join(" ");
}
function collectBlockIds(node: JSONContent): string[] {
  return [
    node.attrs?.id,
    ...(node.content ?? []).flatMap(collectBlockIds),
  ].filter((id): id is string => typeof id === "string");
}
function digestFor(document: NoteDocument): string {
  let hash = 2166136261;
  for (const character of JSON.stringify(document))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16)}`;
}
