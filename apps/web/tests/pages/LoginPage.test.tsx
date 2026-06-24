import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginPage } from "@pages/auth/LoginPage";
import { useSessionStore } from "@entities/session/model/store";

describe("LoginPage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: null,
      status: "guest",
    });
  });

  it("shows client-side email validation instead of browser validation", async () => {
    const login = vi.fn();
    useSessionStore.setState({ login });

    render(<LoginPage onSwitchToRegister={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "ф");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
