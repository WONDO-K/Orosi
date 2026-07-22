import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { editPrivateNote, type NoteDocument, type PrivateNote } from "./note";

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
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true));
  const saveAttempt = useRef(0);
  const draftVersion = useRef(0);
  const mounted = useRef(true);
  const latest = useRef<{ title: string; document: NoteDocument }>({
    title: note.title,
    document: note.document,
  });

  function setCurrentSaveState(next: "saved" | "saving" | "error") {
    if (mounted.current) setSaveState(next);
  }

  function scheduleSave() {
    if (timer.current) clearTimeout(timer.current);
    setCurrentSaveState("saving");
    timer.current = setTimeout(() => void persist(), 400);
  }

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.document,
    editorProps: { attributes: { "aria-label": "노트 내용", role: "textbox" } },
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
          {saveState === "saved" && "기록이 저장됨"}
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
      <EditorContent className="basic-editor" editor={editor} />
      {saveState === "error" && (
        <div className="save-error" role="alert">
          <p>작성 중인 내용은 화면에 그대로 있어요.</p>
          <button onClick={() => void persist()}>다시 저장</button>
        </div>
      )}
    </section>
  );
}
