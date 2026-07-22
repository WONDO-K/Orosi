import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App scaffold", () => {
  it("renders the Orosi wordmark and promise", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "orosi" })).toBeVisible();
    expect(
      screen.getByText(
        "?\uAFA9\uC282??\u907A\u0080\u907A\uAFA8\uCB54 \u5A9B\u0080?\uBA84?, ??\u8ADB\u2479\uB587?\uC1F0\uC908 \u6E72\uACD7\uBF32?\uC10F\uAF6D??",
      ),
    ).toBeVisible();
  });
});
