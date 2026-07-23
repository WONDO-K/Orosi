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
});
