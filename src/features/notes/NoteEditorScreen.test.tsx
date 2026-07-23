import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createPrivateNote, type PrivateNote } from "./note";
import { NoteEditorScreen } from "./NoteEditorScreen";

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("NoteEditorScreen persistence", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays saving when an older write resolves during a newer debounce", async () => {
    vi.useFakeTimers();
    const first = deferred<void>();
    const second = deferred<void>();
    const saves: PrivateNote[] = [];
    const onSave = vi.fn((note: PrivateNote) => {
      saves.push(note);
      return saves.length === 1 ? first.promise : second.promise;
    });

    render(
      <NoteEditorScreen
        note={createPrivateNote("user-a", "2026-07-22T03:00:00.000Z", "note-a")}
        now={() => "2026-07-22T03:00:00.000Z"}
        onSave={onSave}
        onClose={() => undefined}
      />,
    );

    const title = screen.getByRole("textbox", { name: "노트 제목" });
    fireEvent.change(title, { target: { value: "A" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onSave).toHaveBeenCalledTimes(1);

    fireEvent.change(title, { target: { value: "B" } });
    await act(async () => {
      first.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("저장 중");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onSave).toHaveBeenCalledTimes(2);
    await act(async () => {
      second.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("기기에 저장됨");
  });

  it("updates save feedback when mounted under StrictMode", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(() => Promise.resolve());

    render(
      <StrictMode>
        <NoteEditorScreen
          note={createPrivateNote(
            "user-a",
            "2026-07-22T03:00:00.000Z",
            "note-a",
          )}
          now={() => "2026-07-22T03:00:00.000Z"}
          onSave={onSave}
          onClose={() => undefined}
        />
      </StrictMode>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "노트 제목" }), {
      target: { value: "Changed note" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("저장 중");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("기기에 저장됨");
  });

  it("opens a Markdown source draft without changing the rich document", () => {
    render(
      <NoteEditorScreen
        note={createPrivateNote("user-a", "2026-07-22T03:00:00.000Z", "note-a")}
        now={() => "2026-07-22T03:00:00.000Z"}
        onSave={() => Promise.resolve()}
        onClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
    expect(
      screen.getByRole("textbox", { name: "Markdown source" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Keep rich version" }),
    ).toBeVisible();
  });

  it("reopens a saved Markdown recovery draft and persists source edits", async () => {
    vi.useFakeTimers();
    const note = createPrivateNote(
      "user-a",
      "2026-07-22T03:00:00.000Z",
      "note-a",
    );
    note.markdownDraft = "# 복구할 초안";
    const onSave = vi.fn(() => Promise.resolve());
    render(
      <NoteEditorScreen
        note={note}
        now={() => "2026-07-22T03:00:00.000Z"}
        onSave={onSave}
        onClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Markdown" }));
    const source = screen.getByRole("textbox", { name: "Markdown source" });
    expect(source).toHaveValue("# 복구할 초안");
    fireEvent.change(source, { target: { value: "# 수정한 초안" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ markdownDraft: "# 수정한 초안" }),
    );
  });

  it("keeps the note document intact when a non-image file is rejected", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    render(
      <NoteEditorScreen
        note={createPrivateNote("user-a", "2026-07-22T03:00:00.000Z", "note-a")}
        now={() => "2026-07-22T03:00:00.000Z"}
        onSave={onSave}
        onClose={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("이미지 파일"), {
      target: {
        files: [new File(["text"], "memo.txt", { type: "text/plain" })],
      },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 노트 내용은 변경되지 않았습니다",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("offers table operations after inserting a rich table", () => {
    render(
      <NoteEditorScreen
        note={createPrivateNote("user-a", "2026-07-22T03:00:00.000Z", "note-a")}
        now={() => "2026-07-22T03:00:00.000Z"}
        onSave={() => Promise.resolve()}
        onClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Table" }));
    expect(screen.getByRole("button", { name: "Add column" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Merge or split" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete table" })).toBeVisible();
  });
});
