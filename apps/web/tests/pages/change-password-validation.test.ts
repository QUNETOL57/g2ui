import { describe, expect, it } from "vitest";

import {
  hasChangePasswordFormErrors,
  validateChangePasswordForm,
} from "@pages/auth/lib/change-password-validation";

describe("change-password validation", () => {
  it("requires all fields and matching confirmation", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "",
      newPassword: "short",
      newPasswordConfirm: "different",
    });
    expect(errors.currentPassword).toBeTruthy();
    expect(errors.newPassword).toBeTruthy();
    expect(errors.newPasswordConfirm).toBeTruthy();
    expect(hasChangePasswordFormErrors(errors)).toBe(true);
  });

  it("accepts valid values", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "oldpassword",
      newPassword: "newpassword",
      newPasswordConfirm: "newpassword",
    });
    expect(hasChangePasswordFormErrors(errors)).toBe(false);
  });

  it("requires at least 8 characters for the new password", () => {
    const errors = validateChangePasswordForm({
      currentPassword: "oldpassword",
      newPassword: "short",
      newPasswordConfirm: "short",
    });
    expect(errors.newPassword).toBe("Password must be at least 8 characters");
    expect(hasChangePasswordFormErrors(errors)).toBe(true);
  });
});
