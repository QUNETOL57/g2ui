export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address";
  }
  return undefined;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = "Password is required";
  return errors;
}

export function hasFormErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
