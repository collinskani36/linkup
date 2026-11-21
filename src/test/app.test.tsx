import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "@/App";

describe("App", () => {
  it("shows the sign-up screen when nobody is logged in", async () => {
    render(<App />);

    expect(await screen.findByText("Create your account")).toBeTruthy();
    expect(screen.getByLabelText("Username")).toBeTruthy();
    expect(screen.getByLabelText("Phone number")).toBeTruthy();
  });
});
