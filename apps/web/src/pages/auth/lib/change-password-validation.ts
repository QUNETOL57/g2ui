import { hasFormErrors } from "@pages/auth/lib/auth-validation";

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
}

export function validateChangePasswordForm(
  values: ChangePasswordFormValues,
): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {};

  if (!values.currentPassword) {
    errors.currentPassword = "Current password is required";
  }

  if (!values.newPassword) {
    errors.newPassword = "New password is required";
  } else if (values.newPassword.length < 8) {
    errors.newPassword = "Password must be at least 8 characters";
  }

  if (!values.newPasswordConfirm) {
    errors.newPasswordConfirm = "Please confirm your new password";
  } else if (values.newPassword !== values.newPasswordConfirm) {
    errors.newPasswordConfirm = "Passwords do not match";
  }

  return errors;
}

export function hasChangePasswordFormErrors(errors: ChangePasswordFormErrors): boolean {
  return hasFormErrors(errors);
}
