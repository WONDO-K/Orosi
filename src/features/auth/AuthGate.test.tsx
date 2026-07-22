import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeAuthRepository } from "@/test/fakeAuth";
import { AuthGate } from "./AuthGate";

describe("AuthGate", () => {
  it("does not render protected content before authentication", async () => {
    const auth = new FakeAuthRepository({
      status: "signedOut",
      reason: "first-login-online",
    });
    render(
      <AuthGate auth={auth} platform="android">
        {() => <div>媛쒖씤 ?명듃</div>}
      </AuthGate>,
    );

    expect(
      await screen.findByRole("button", { name: "Google濡?怨꾩냽?섍린" }),
    ).toBeVisible();
    expect(screen.queryByText("媛쒖씤 ?명듃")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apple濡?怨꾩냽?섍린" }),
    ).not.toBeInTheDocument();
  });

  it("offers Apple and Google on iOS and sends the selected provider", async () => {
    const user = userEvent.setup();
    const auth = new FakeAuthRepository({ status: "signedOut" });
    render(
      <AuthGate auth={auth} platform="ios">
        {() => <div />}
      </AuthGate>,
    );

    await user.click(
      await screen.findByRole("button", { name: "Apple濡?怨꾩냽?섍린" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Google濡?怨꾩냽?섍린" }),
    );
    expect(auth.signInCalls).toEqual(["apple", "google"]);
  });

  it("renders protected content and an offline status for a cached session", async () => {
    const auth = new FakeAuthRepository({
      status: "signedIn",
      userId: "user-a",
      email: null,
      offline: true,
      lastValidatedAt: "2026-07-22T03:00:00.000Z",
    });
    render(
      <AuthGate auth={auth} platform="android">
        {(session) => <div>?ъ슜??{session.userId}??媛쒖씤 ?명듃</div>}
      </AuthGate>,
    );

    expect(await screen.findByText("?ъ슜??user-a??媛쒖씤 ?명듃")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "?ㅽ봽?쇱씤?먯꽌????湲곌린???명듃瑜??몄쭛?????덉뼱??",
    );
  });
});
