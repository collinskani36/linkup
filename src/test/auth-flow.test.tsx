import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthScreen } from "@/components/AuthScreen";

const auth = vi.hoisted(() => ({
  isUsernameAvailable: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  verifySignupOtp: vi.fn(),
  resendSignupOtp: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, ...auth };
});

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("AuthScreen", () => {
  beforeEach(() => {
    Object.values(auth).forEach((fn) => fn.mockReset());
    auth.isUsernameAvailable.mockResolvedValue(true);
  });

  it("validates, signs up, then asks for the emailed code", async () => {
    auth.signUp.mockResolvedValue({ needsOtp: true });
    render(<AuthScreen />);

    fireEvent.click(screen.getByText("Send my code"));
    expect(await screen.findByText("Tell us your name.")).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();

    fill("Your name", "Wanjiku Mwangi");
    fill("Username", "Wanjiku_M");
    fill("Age", "27");
    fill("Phone number", "0712 345 678");
    fill("Email", "wanjiku@example.com");
    fill("Password", "supersecret");
    await waitFor(() => expect(screen.getByText("✓ Available")).toBeTruthy());

    fireEvent.click(screen.getByText("Send my code"));
    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ username: "wanjiku_m", email: "wanjiku@example.com" }),
    );
  });

  it("blocks under-18s before calling the server", async () => {
    render(<AuthScreen />);
    fill("Age", "16");
    fireEvent.click(screen.getByText("Send my code"));
    expect(await screen.findByText("You need to be 18 or older to join.")).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("logs in with a username", async () => {
    auth.signIn.mockResolvedValue(undefined);
    render(<AuthScreen />);

    fireEvent.click(screen.getByText("Log in"));
    fill("Username or email", "wanjiku_m");
    fill("Password", "supersecret");
    fireEvent.click(screen.getByRole("button", { name: /^Log in/ }));

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith("wanjiku_m", "supersecret"));
  });
  it("walks through forgot password: request a code, set a new password, back to login", async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined);
    auth.resetPassword.mockResolvedValue(undefined);
    render(<AuthScreen />);

    fireEvent.click(screen.getByText("Log in"));
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(await screen.findByText("Forgot your password?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Send reset code/ }));
    expect(await screen.findByText("Enter your username or email.")).toBeTruthy();
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();

    fill("Username or email", "wanjiku_m");
    fireEvent.click(screen.getByRole("button", { name: /^Send reset code/ }));
    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(auth.requestPasswordReset).toHaveBeenCalledWith("wanjiku_m");

    fill("New password", "short");
    fireEvent.change(screen.getByLabelText("6-digit reset code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /^Update password/ }));
    expect(await screen.findByText("Use at least 8 characters.")).toBeTruthy();
    expect(auth.resetPassword).not.toHaveBeenCalled();

    fill("New password", "brandnewpass");
    fireEvent.click(screen.getByRole("button", { name: /^Update password/ }));
    await waitFor(() =>
      expect(auth.resetPassword).toHaveBeenCalledWith({
        identifier: "wanjiku_m",
        code: "123456",
        password: "brandnewpass",
      }),
    );
    expect(
      await screen.findByText("Password updated. Log in with your new password."),
    ).toBeTruthy();
    expect((screen.getByLabelText("Username or email") as HTMLInputElement).value).toBe(
      "wanjiku_m",
    );
  });

  it("shows the server's message when the reset code is wrong", async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined);
    auth.resetPassword.mockRejectedValue(
      new Error("That code didn’t work. Check it or ask for a new one."),
    );
    render(<AuthScreen />);

    fireEvent.click(screen.getByText("Log in"));
    fireEvent.click(screen.getByText("Forgot password?"));
    fill("Username or email", "wanjiku@example.com");
    fireEvent.click(screen.getByRole("button", { name: /^Send reset code/ }));
    await screen.findByText("Check your email");

    fireEvent.change(screen.getByLabelText("6-digit reset code"), { target: { value: "000000" } });
    fill("New password", "brandnewpass");
    fireEvent.click(screen.getByRole("button", { name: /^Update password/ }));
    expect(
      await screen.findByText("That code didn’t work. Check it or ask for a new one."),
    ).toBeTruthy();
  });
});
