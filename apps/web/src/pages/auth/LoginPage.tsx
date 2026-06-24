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
  hasFormErrors,
  validateLoginForm,
  type LoginFormErrors,
} from "./lib/auth-validation";

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onAuthenticated?: () => Promise<void> | void;
}

export function LoginPage({ onSwitchToRegister, onAuthenticated }: LoginPageProps) {
  const login = useSessionStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validateLoginForm({ email, password });
    setFieldErrors(validationErrors);
    if (hasFormErrors(validationErrors)) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      await onAuthenticated?.();
    } catch (submitError) {
      setError(parseAuthError(submitError, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      kicker="Sign in"
      description="Use your email and password to access your projects."
      footer={
        <>
          No account yet?{" "}
          <button type="button" className={styles.switchButton} onClick={onSwitchToRegister}>
            Create one
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
              autoComplete="current-password"
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

        {error ? <p className={styles.errorBanner}>{error}</p> : null}

        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
