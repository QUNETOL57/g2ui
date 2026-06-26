import { useState, type FormEvent } from "react";

import { changePassword } from "@shared/api/auth";
import { Button } from "@shared/ui/Button";
import { Field } from "@shared/ui/Field";
import { IconButton } from "@shared/ui/IconButton";
import { Input } from "@shared/ui/Input";
import { Modal } from "@shared/ui/Modal";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";
import { AuthLayout } from "@pages/auth/AuthLayout";
import { parseAuthError } from "@pages/auth/lib/auth-errors";
import {
  hasChangePasswordFormErrors,
  validateChangePasswordForm,
} from "@pages/auth/lib/change-password-validation";

import authStyles from "@pages/auth/AuthPage.module.css";
import styles from "./ChangePasswordModal.module.css";

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateChangePasswordForm>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowNewPasswordConfirm(false);
    setFieldErrors({});
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateChangePasswordForm({
      currentPassword,
      newPassword,
      newPasswordConfirm,
    });
    setFieldErrors(validationErrors);
    if (hasChangePasswordFormErrors(validationErrors)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setSuccess("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setFieldErrors({});
    } catch (submitError) {
      setError(parseAuthError(submitError, "Unable to change password"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} size="md" closeOnBackdrop={false}>
      <IconButton
        className={styles.modalClose}
        aria-label="Close change password"
        title="Close"
        onClick={handleClose}
      >
        ×
      </IconButton>
      <AuthLayout
        kicker="Change password"
        description="Enter your current password and choose a new one."
      >
        <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
          <Field label="Current password" error={fieldErrors.currentPassword}>
            <div className={authStyles.passwordField}>
              <Input
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                size="lg"
                className={authStyles.passwordInput}
                value={currentPassword}
                invalid={Boolean(fieldErrors.currentPassword)}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <VisibilityToggleButton
                className={authStyles.passwordToggle}
                visible={showCurrentPassword}
                label="current password"
                onToggle={() => setShowCurrentPassword((value) => !value)}
              />
            </div>
          </Field>

          <Field label="New password" error={fieldErrors.newPassword}>
            <div className={authStyles.passwordField}>
              <Input
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                size="lg"
                className={authStyles.passwordInput}
                value={newPassword}
                invalid={Boolean(fieldErrors.newPassword)}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <VisibilityToggleButton
                className={authStyles.passwordToggle}
                visible={showNewPassword}
                label="new password"
                onToggle={() => setShowNewPassword((value) => !value)}
              />
            </div>
          </Field>

          <Field label="Confirm new password" error={fieldErrors.newPasswordConfirm}>
            <div className={authStyles.passwordField}>
              <Input
                type={showNewPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                size="lg"
                className={authStyles.passwordInput}
                value={newPasswordConfirm}
                invalid={Boolean(fieldErrors.newPasswordConfirm)}
                onChange={(event) => setNewPasswordConfirm(event.target.value)}
              />
              <VisibilityToggleButton
                className={authStyles.passwordToggle}
                visible={showNewPasswordConfirm}
                label="new password confirmation"
                onToggle={() => setShowNewPasswordConfirm((value) => !value)}
              />
            </div>
          </Field>

          {error ? <p className={authStyles.errorBanner}>{error}</p> : null}
          {success ? <p className={styles.successBanner}>{success}</p> : null}

          <div className={authStyles.actions}>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={authStyles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Update password"}
            </Button>
          </div>
        </form>
      </AuthLayout>
    </Modal>
  );
}
