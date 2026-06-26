import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { changePassword } from "@shared/api/auth";
import { ApiError } from "@shared/api/client";
import { ChangePasswordModal } from "@widgets/account/ChangePasswordModal";

vi.mock("@shared/api/auth", () => ({
  changePassword: vi.fn(),
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    vi.mocked(changePassword).mockReset();
  });

  it("shows client-side validation instead of submitting invalid form", async () => {
    render(<ChangePasswordModal open onClose={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Current password is required")).toBeInTheDocument();
    expect(screen.getByText("New password is required")).toBeInTheDocument();
    expect(screen.getByText("Please confirm your new password")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("submits valid form and shows success message", async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);

    render(<ChangePasswordModal open onClose={() => {}} />);

    await userEvent.type(screen.getByLabelText("Current password"), "password123");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword123");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword123");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(changePassword).toHaveBeenCalledWith({
      current_password: "password123",
      new_password: "newpassword123",
      new_password_confirm: "newpassword123",
    });
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
  });

  it("shows API error for incorrect current password", async () => {
    vi.mocked(changePassword).mockRejectedValue(
      new ApiError(JSON.stringify({ detail: "Current password is incorrect" }), 400),
    );

    render(<ChangePasswordModal open onClose={() => {}} />);

    await userEvent.type(screen.getByLabelText("Current password"), "wrong-password");
    await userEvent.type(screen.getByLabelText("New password"), "newpassword123");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "newpassword123");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Current password is incorrect")).toBeInTheDocument();
  });
});
