import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App scaffold", () => {
  it("renders the Orosi wordmark and promise", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "orosi" })).toBeVisible();
    expect(
      screen.getByText("필요한 부분만 가져와, 내 방식으로 기억하세요."),
    ).toBeVisible();
  });
});
