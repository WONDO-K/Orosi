import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createPrivateNote } from "@/features/notes/note";
import { IndexedDbDatabaseFactory } from "@/platform/database/indexedDbNotes";
import { FakeAuthRepository } from "@/test/fakeAuth";
import { App } from "./App";

describe("protected Orosi shell", () => {
  it("shows the three navigation destinations only after login", async () => {
    const auth = new FakeAuthRepository({
      status: "signedIn",
      userId: "user-a",
      email: "a@example.com",
      offline: false,
      lastValidatedAt: "2026-07-22T03:00:00.000Z",
    });
    const databases = new IndexedDbDatabaseFactory("orosi-app-test-shell");
    render(
      <App
        dependencies={{
          auth,
          databases,
          platform: "android",
          now: () => "2026-07-22T03:00:00.000Z",
          newId: () => "note-a",
        }}
      />,
    );

    expect(
      await screen.findByRole("navigation", { name: "二쇱슂 硫붾돱" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "???명듃" })).toBeVisible();
    expect(screen.getByRole("button", { name: "?섎윭蹂닿린" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("button", { name: "?ㅼ젙" })).toBeVisible();
  });

  it("warns before logout and clears the account partition after confirmation", async () => {
    const user = userEvent.setup();
    const auth = new FakeAuthRepository({
      status: "signedIn",
      userId: "user-a",
      email: null,
      offline: false,
      lastValidatedAt: "2026-07-22T03:00:00.000Z",
    });
    const databases = new IndexedDbDatabaseFactory("orosi-app-test-logout");
    const repository = await databases.open("user-a");
    await repository.put(
      createPrivateNote("user-a", "2026-07-22T03:00:00.000Z", "note-a"),
    );
    await repository.close();
    const destroy = vi.spyOn(databases, "destroy");
    render(
      <App
        dependencies={{
          auth,
          databases,
          platform: "android",
          now: () => "2026-07-22T03:00:00.000Z",
          newId: () => "note-b",
        }}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "?ㅼ젙" }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(
      screen.getByRole("button", { name: "??湲곌린?먯꽌 濡쒓렇?꾩썐" }),
    );

    await waitFor(() => expect(auth.signOutCalls).toBe(1));
    await waitFor(() => expect(destroy).toHaveBeenCalledWith("user-a"));
    await destroy.mock.results[0].value;
    const reopened = await databases.open("user-a");
    await expect(reopened.list("active")).resolves.toEqual([]);
    await reopened.close();
    await databases.destroy("user-a");
  });
});
