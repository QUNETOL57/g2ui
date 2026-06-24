export interface RegisterFormValues {
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!values.password) {
    errors.password = "Password is required";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters";
  }

  if (!values.passwordConfirm) {
    errors.passwordConfirm = "Please confirm your password";
  } else if (values.password !== values.passwordConfirm) {
    errors.passwordConfirm = "Passwords do not match";
  }

  return errors;
}

export function hasRegisterFormErrors(errors: RegisterFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
