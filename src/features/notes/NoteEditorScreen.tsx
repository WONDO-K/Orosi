import { useEffect, useRef, useState } from "react";
import { Color } from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import UniqueID from "@tiptap/extension-unique-id";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { privateAssetStore } from "./asset";
import { editPrivateNote, type NoteDocument, type PrivateNote } from "./note";

type SaveState = "saved" | "saving" | "error";

export function NoteEditorScreen({
  note,
  now,
  onSave,
  onClose,
}: {
  note: PrivateNote;
  now: () => string;
  onSave: (note: PrivateNote) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [tagsInput, setTagsInput] = useState(note.tags.join(", "));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [sourceMode, setSourceMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState(note.markdownDraft ?? "");
  const [assetError, setAssetError] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveAttempt = useRef(0);
  const draftVersion = useRef(0);
  const mounted = useRef(true);
  const latest = useRef<{
    title: string;
    document: NoteDocument;
    tags: string[];
    markdownDraft: string | null;
    assets: PrivateNote["assets"];
  }>({
    title: note.title,
    document: note.document,
    tags: note.tags,
    markdownDraft: note.markdownDraft,
    assets: note.assets,
  });

  function setCurrentSaveState(next: SaveState) {
    if (mounted.current) setSaveState(next);
  }

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    setCurrentSaveState("saving");
    timer.current = setTimeout(() => void persist(), 400);
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      UniqueID.configure({
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "taskList",
          "table",
          "tableRow",
        ],
      }),
      Markdown,
    ],
    content: note.document,
    editorProps: {
      attributes: { "aria-label": "노트 내용", role: "textbox" },
    },
    onUpdate: ({ editor: current }) => {
      latest.current.document = current.getJSON() as NoteDocument;
      draftVersion.current += 1;
      scheduleSave();
    },
  });

  function persist(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCurrentSaveState("saving");
    const attempt = ++saveAttempt.current;
    const version = draftVersion.current;
    const change = structuredClone(latest.current);
    saveChain.current = saveChain.current.then(async () => {
      try {
        await onSave(editPrivateNote(note, { ...change, now: now() }));
        if (
          attempt === saveAttempt.current &&
          version === draftVersion.current &&
          timer.current === null
        ) {
          setCurrentSaveState("saved");
        }
        return true;
      } catch {
        if (
          attempt === saveAttempt.current &&
          version === draftVersion.current &&
          timer.current === null
        ) {
          setCurrentSaveState("error");
        }
        return false;
      }
    });
    return saveChain.current;
  }

  function enterSourceMode() {
    if (!editor) return;
    const draft = note.markdownDraft ?? editor.getMarkdown();
    setMarkdownDraft(draft);
    latest.current.markdownDraft = draft;
    draftVersion.current += 1;
    scheduleSave();
    setSourceError(null);
    setSourceMode(true);
  }

  async function addImage(file: File | undefined) {
    if (!file || !editor) return;
    setAssetError(null);
    try {
      const asset = await privateAssetStore().copy({
        ownerId: note.ownerId,
        noteId: note.id,
        file,
        id: crypto.randomUUID(),
        now: now(),
      });
      latest.current.assets = [
        ...latest.current.assets,
        {
          id: asset.id,
          uri: asset.uri,
          mimeType: asset.mimeType,
          byteSize: asset.byteSize,
          sha256: asset.sha256,
          width: asset.width,
          height: asset.height,
          createdAt: asset.createdAt,
        },
      ];
      editor.chain().focus().setImage({ src: asset.uri, alt: file.name }).run();
      draftVersion.current += 1;
      scheduleSave();
    } catch {
      setAssetError(
        "이미지를 저장하지 못했습니다. 현재 노트 내용은 변경되지 않았습니다.",
      );
    } finally {
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  function applyMarkdown() {
    if (!editor) return;
    try {
      editor.commands.setContent(markdownDraft, { contentType: "markdown" });
      latest.current.document = editor.getJSON() as NoteDocument;
      latest.current.markdownDraft = null;
      draftVersion.current += 1;
      scheduleSave();
      setSourceError(null);
      setSourceMode(false);
    } catch {
      setSourceError(
        "Markdown could not be applied. Your draft is still safe here.",
      );
    }
  }

  function exportMarkdown() {
    if (!editor) return;
    const blob = new Blob([editor.getMarkdown()], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim() || "orosi-note"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function close() {
    if (await persist()) onClose();
  }

  return (
    <section className="editor-screen" aria-label="개인 노트 편집기">
      <header className="editor-header">
        <button onClick={() => void close()}>닫기</button>
        <span role="status">
          {saveState === "saved" && "기기에 저장됨"}
          {saveState === "saving" && "저장 중"}
          {saveState === "error" && "아직 저장하지 못했어요."}
        </span>
      </header>
      <input
        aria-label="노트 제목"
        className="note-title-input"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          latest.current.title = event.target.value;
          draftVersion.current += 1;
          scheduleSave();
        }}
      />
      <input
        aria-label="노트 태그"
        className="note-tags-input"
        placeholder="태그를 쉼표로 구분"
        value={tagsInput}
        onChange={(event) => {
          const next = event.target.value;
          setTagsInput(next);
          latest.current.tags = [
            ...new Set(
              next
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          ];
          draftVersion.current += 1;
          scheduleSave();
        }}
      />
      {!sourceMode && editor && (
        <div className="editor-toolbar" aria-label="Formatting controls">
          <button onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            Underline
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Bullets
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            Numbered
          </button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()}>
            Tasks
          </button>
          <button
            onClick={() => editor.chain().focus().setColor("#bf5f4b").run()}
          >
            Color
          </button>
          <button
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            Table
          </button>
          <button
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
                .run()
            }
          >
            2 × 2
          </button>
          <button onClick={() => editor.chain().focus().undo().run()}>
            Undo
          </button>
          <button onClick={() => editor.chain().focus().redo().run()}>
            Redo
          </button>
          <button onClick={() => imageInput.current?.click()}>Image</button>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            aria-label="이미지 파일"
            onChange={(event) => void addImage(event.target.files?.[0])}
          />
          <button onClick={enterSourceMode}>Markdown</button>
          <button onClick={exportMarkdown}>Export</button>
        </div>
      )}
      {!sourceMode && editor?.isActive("table") && (
        <div className="table-toolbar" aria-label="Table controls">
          <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
            Add column
          </button>
          <button
            onClick={() => editor.chain().focus().addColumnBefore().run()}
          >
            Add column before
          </button>
          <button onClick={() => editor.chain().focus().addRowAfter().run()}>
            Add row
          </button>
          <button onClick={() => editor.chain().focus().addRowBefore().run()}>
            Add row before
          </button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()}>
            Delete column
          </button>
          <button onClick={() => editor.chain().focus().deleteRow().run()}>
            Delete row
          </button>
          <button onClick={() => editor.chain().focus().mergeOrSplit().run()}>
            Merge or split
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          >
            Header row
          </button>
          <button onClick={() => editor.chain().focus().deleteTable().run()}>
            Delete table
          </button>
        </div>
      )}
      {sourceMode ? (
        <div className="markdown-source">
          <label htmlFor="markdown-source">Markdown source</label>
          <textarea
            id="markdown-source"
            value={markdownDraft}
            onChange={(event) => {
              const next = event.target.value;
              setMarkdownDraft(next);
              latest.current.markdownDraft = next;
              draftVersion.current += 1;
              scheduleSave();
            }}
          />
          {sourceError && <p role="alert">{sourceError}</p>}
          <button onClick={applyMarkdown}>Apply Markdown</button>
          <button onClick={() => setSourceMode(false)}>
            Keep rich version
          </button>
        </div>
      ) : (
        <EditorContent className="basic-editor" editor={editor} />
      )}
      {saveState === "error" && (
        <div className="save-error" role="alert">
          <p>
            Your draft remains in this editor. Try saving again before closing.
          </p>
          <button onClick={() => void persist()}>Retry save</button>
        </div>
      )}
      {assetError && (
        <p className="save-error" role="alert">
          {assetError}
        </p>
      )}
    </section>
  );
}
