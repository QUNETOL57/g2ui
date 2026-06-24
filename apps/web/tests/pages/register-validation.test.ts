import { describe, expect, it } from "vitest";

import {
  hasRegisterFormErrors,
  validateRegisterForm,
} from "@pages/auth/lib/register-validation";

describe("validateRegisterForm", () => {
  it("accepts valid registration values", () => {
    const errors = validateRegisterForm({
      email: "user@example.com",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(errors).toEqual({});
    expect(hasRegisterFormErrors(errors)).toBe(false);
  });

  it("requires matching passwords", () => {
    const errors = validateRegisterForm({
      email: "user@example.com",
      password: "password123",
      passwordConfirm: "different123",
    });
    expect(errors.passwordConfirm).toBe("Passwords do not match");
    expect(hasRegisterFormErrors(errors)).toBe(true);
  });

  it("requires password with at least 8 characters", () => {
    const errors = validateRegisterForm({
      email: "user@example.com",
      password: "short",
      passwordConfirm: "short",
    });
    expect(errors.password).toBe("Password must be at least 8 characters");
    expect(hasRegisterFormErrors(errors)).toBe(true);
  });

  it("requires a valid email address", () => {
    const errors = validateRegisterForm({
      email: "not-an-email",
      password: "password123",
      passwordConfirm: "password123",
    });
    expect(errors.email).toBe("Enter a valid email address");
    expect(hasRegisterFormErrors(errors)).toBe(true);
  });
});
