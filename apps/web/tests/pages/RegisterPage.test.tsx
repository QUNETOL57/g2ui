import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegisterPage } from "@pages/auth/RegisterPage";
import { useSessionStore } from "@entities/session/model/store";

describe("RegisterPage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      user: null,
      status: "guest",
    });
  });

  it("shows a client-side error when passwords do not match", async () => {
    const register = vi.fn();
    useSessionStore.setState({ register });

    render(<RegisterPage onSwitchToLogin={() => {}} />);

    await userEvent.type(screen.getByPlaceholderText("you@example.com"), "user@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.type(screen.getByLabelText("Confirm password"), "different123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});
