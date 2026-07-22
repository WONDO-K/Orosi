import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryDatabaseFactory } from "@/test/memoryNotes";
import { NotesScreen } from "./NotesScreen";

function rects() {
  const rect = new DOMRect(0, 0, 1, 1);
  return { 0: rect, length: 1, item: () => rect } as unknown as DOMRectList;
}

Object.defineProperty(document, "elementFromPoint", {
  value: () => document.body,
});
Object.defineProperty(Node.prototype, "getClientRects", { value: rects });
Object.defineProperty(Node.prototype, "getBoundingClientRect", {
  value: () => new DOMRect(0, 0, 1, 1),
});
Object.defineProperty(Range.prototype, "getClientRects", { value: rects });
Object.defineProperty(Range.prototype, "getBoundingClientRect", {
  value: () => new DOMRect(0, 0, 1, 1),
});

describe("NotesScreen local lifecycle", () => {
  function renderNotes() {
    const databases = new MemoryDatabaseFactory();
    render(
      <NotesScreen
        ownerId="user-a"
        databases={databases}
        now={() => "2026-07-22T03:00:00.000Z"}
        newId={() => "note-a"}
      />,
    );
    return databases;
  }

  it("creates, flushes on close, and reopens a private Tiptap note", async () => {
    const user = userEvent.setup();
    renderNotes();

    await user.click(await screen.findByRole("button", { name: "새 노트" }));
    await user.clear(screen.getByRole("textbox", { name: "노트 제목" }));
    await user.type(
      screen.getByRole("textbox", { name: "노트 제목" }),
      "휴식보다 앞서는 기록",
    );
    await user.type(
      screen.getByRole("textbox", { name: "노트 내용" }),
      "작은 기억의 문장",
    );
    await user.click(screen.getByRole("button", { name: "닫기" }));

    await user.click(
      await screen.findByRole("button", { name: "휴식보다 앞서는 기록 열기" }),
    );
    expect(
      screen.getByRole("textbox", { name: "노트 내용" }),
    ).toHaveTextContent("작은 기억의 문장");
  });

  it("moves a note to Trash, restores it, then permanently deletes it", async () => {
    const user = userEvent.setup();
    renderNotes();
    await user.click(await screen.findByRole("button", { name: "새 노트" }));
    await user.click(screen.getByRole("button", { name: "닫기" }));

    const activeCard = await screen.findByRole("article", {
      name: "제목 없는 노트",
    });
    await user.click(
      within(activeCard).getByRole("button", { name: "휴지통으로 이동" }),
    );
    await user.click(screen.getByRole("button", { name: "휴지통 보기" }));
    const trashCard = await screen.findByRole("article", {
      name: "제목 없는 노트",
    });
    await user.click(within(trashCard).getByRole("button", { name: "복원" }));
    expect(
      screen.queryByRole("article", { name: "제목 없는 노트" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "노트 보기" }));
    const restoredCard = await screen.findByRole("article", {
      name: "제목 없는 노트",
    });
    await user.click(
      within(restoredCard).getByRole("button", { name: "휴지통으로 이동" }),
    );
    await user.click(screen.getByRole("button", { name: "휴지통 보기" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(
      within(
        await screen.findByRole("article", { name: "제목 없는 노트" }),
      ).getByRole("button", { name: "영구 삭제" }),
    );
    expect(
      screen.queryByRole("article", { name: "제목 없는 노트" }),
    ).not.toBeInTheDocument();
  });
});
