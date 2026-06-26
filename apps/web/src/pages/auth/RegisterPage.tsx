import { useState, type FormEvent } from "react";

import { useSessionStore } from "@entities/session/model/store";
import { Button } from "@shared/ui/Button";
import { Field } from "@shared/ui/Field";
import { Input } from "@shared/ui/Input";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";

import { AuthLayout } from "./AuthLayout";
import styles from "./AuthPage.module.css";
import { parseAuthError } from "./lib/auth-errors";
import {
  hasRegisterFormErrors,
  validateRegisterForm,
} from "./lib/register-validation";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onAuthenticated?: () => Promise<void> | void;
}

export function RegisterPage({ onSwitchToLogin, onAuthenticated }: RegisterPageProps) {
  const register = useSessionStore((state) => state.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateRegisterForm>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateRegisterForm({ email, password, passwordConfirm });
    setFieldErrors(validationErrors);
    if (hasRegisterFormErrors(validationErrors)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim(),
        password,
        password_confirm: passwordConfirm,
      });
      await onAuthenticated?.();
    } catch (submitError) {
      setError(parseAuthError(submitError, "Unable to create account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      kicker="Create account"
      description="Register with your email and password to save projects in the cloud."
      footer={
        <>
          Already have an account?{" "}
          <button type="button" className={styles.switchButton} onClick={onSwitchToLogin}>
            Sign in
          </button>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            autoComplete="email"
            size="lg"
            value={email}
            invalid={Boolean(fieldErrors.email)}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Password" error={fieldErrors.password}>
          <div className={styles.passwordField}>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              size="lg"
              className={styles.passwordInput}
              value={password}
              invalid={Boolean(fieldErrors.password)}
              onChange={(event) => setPassword(event.target.value)}
            />
            <VisibilityToggleButton
              className={styles.passwordToggle}
              visible={showPassword}
              label="password"
              onToggle={() => setShowPassword((value) => !value)}
            />
          </div>
        </Field>

        <Field label="Confirm password" error={fieldErrors.passwordConfirm}>
          <div className={styles.passwordField}>
            <Input
              type={showPasswordConfirm ? "text" : "password"}
              autoComplete="new-password"
              size="lg"
              className={styles.passwordInput}
              value={passwordConfirm}
              invalid={Boolean(fieldErrors.passwordConfirm)}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
            <VisibilityToggleButton
              className={styles.passwordToggle}
              visible={showPasswordConfirm}
              label="password confirmation"
              onToggle={() => setShowPasswordConfirm((value) => !value)}
            />
          </div>
        </Field>

        {error ? <p className={styles.errorBanner}>{error}</p> : null}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
