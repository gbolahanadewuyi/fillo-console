import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { login, resetPassword, ownResetPassword } = vi.hoisted(() => ({ login: vi.fn(), resetPassword: vi.fn(), ownResetPassword: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false, login, resetPassword }) }));
vi.mock("@/lib/own-auth", async () => ({ ...(await vi.importActual<typeof import("@/lib/own-auth")>("@/lib/own-auth")), resetPassword: ownResetPassword }));

import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";

const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  login.mockReset();
  resetPassword.mockReset();
  ownResetPassword.mockReset();
});

describe("sign in", () => {
  const show = () => render(<MemoryRouter><Login /></MemoryRouter>);

  it("says what is missing next to the field, and does not call the server", async () => {
    show();
    submit("Sign in");
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("refuses something that is not an email", async () => {
    show();
    type("Email", "not-an-email");
    type("Password", "x");
    submit("Sign in");
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in with the email trimmed and the password untouched", async () => {
    login.mockResolvedValue(undefined);
    show();
    type("Email", "  admin@fillo.cloud  ");
    type("Password", " spaced pass ");
    submit("Sign in");
    await waitFor(() => expect(login).toHaveBeenCalledWith("admin@fillo.cloud", " spaced pass "));
  });

  it("shows the server's refusal", async () => {
    login.mockRejectedValue(new Error("Invalid email or password."));
    show();
    type("Email", "admin@fillo.cloud");
    type("Password", "wrong");
    submit("Sign in");
    expect(await screen.findByText("Invalid email or password.")).toBeInTheDocument();
  });
});

describe("forgot password", () => {
  const show = () => render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

  it("needs a valid email before asking", async () => {
    show();
    type("Email", "nope");
    submit("Send reset link");
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("sends the trimmed address and then says the link is on its way", async () => {
    resetPassword.mockResolvedValue(undefined);
    show();
    type("Email", " me@fillo.cloud ");
    submit("Send reset link");
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("me@fillo.cloud"));
    expect(await screen.findByRole("link", { name: "Back to sign in" })).toBeInTheDocument();
  });
});

describe("choose a new password", () => {
  const show = () => render(<MemoryRouter initialEntries={["/reset-password?token=tok123"]}><ResetPassword /></MemoryRouter>);

  it("wants at least 10 characters", async () => {
    show();
    type("New password", "short");
    type("Confirm new password", "short");
    submit("Change password");
    expect(await screen.findByText("Use at least 10 characters.")).toBeInTheDocument();
    expect(ownResetPassword).not.toHaveBeenCalled();
  });

  it("wants the two to match", async () => {
    show();
    type("New password", "a-long-enough-one");
    type("Confirm new password", "a-different-one!");
    submit("Change password");
    expect(await screen.findByText("The two passwords do not match.")).toBeInTheDocument();
    expect(ownResetPassword).not.toHaveBeenCalled();
  });

  it("sends the emailed token with the new password", async () => {
    ownResetPassword.mockResolvedValue(undefined);
    show();
    type("New password", "a-long-enough-one");
    type("Confirm new password", "a-long-enough-one");
    submit("Change password");
    await waitFor(() => expect(ownResetPassword).toHaveBeenCalledWith("tok123", "a-long-enough-one"));
  });
});
