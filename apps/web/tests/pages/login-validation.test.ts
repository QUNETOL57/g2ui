import { describe, expect, it } from "vitest";

import { hasFormErrors, validateLoginForm } from "@pages/auth/lib/auth-validation";

describe("validateLoginForm", () => {
  it("accepts valid login values", () => {
    const errors = validateLoginForm({ email: "user@example.com", password: "password123" });
    expect(errors).toEqual({});
    expect(hasFormErrors(errors)).toBe(false);
  });

  it("requires a valid email address", () => {
    const errors = validateLoginForm({ email: "not-an-email", password: "password123" });
    expect(errors.email).toBe("Enter a valid email address");
    expect(hasFormErrors(errors)).toBe(true);
  });

  it("requires password", () => {
    const errors = validateLoginForm({ email: "user@example.com", password: "" });
    expect(errors.password).toBe("Password is required");
    expect(hasFormErrors(errors)).toBe(true);
  });
});
