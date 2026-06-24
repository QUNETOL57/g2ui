import { useState, type FormEvent } from "react";

import { useSessionStore } from "@entities/session/model/store";
import { BrandLogo } from "@shared/ui/BrandLogo";
import { Button } from "@shared/ui/Button";
import { Field } from "@shared/ui/Field";
import { Input } from "@shared/ui/Input";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";

import styles from "./AuthPage.module.css";
import { parseAuthError } from "./lib/auth-errors";
import {
  hasRegisterFormErrors,
  validateRegisterForm,
} from "./lib/register-validation";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
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
    } catch (submitError) {
      setError(parseAuthError(submitError, "Unable to create account"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <BrandLogo />
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Register with your email and password to save projects.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Email" error={fieldErrors.email}>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              invalid={Boolean(fieldErrors.email)}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Password" error={fieldErrors.password}>
            <div className={styles.passwordField}>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                invalid={Boolean(fieldErrors.password)}
                onChange={(event) => setPassword(event.target.value)}
                required
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
                value={passwordConfirm}
                invalid={Boolean(fieldErrors.passwordConfirm)}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
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
            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>

        <p className={styles.switchMode}>
          Already have an account?{" "}
          <button type="button" className={styles.switchButton} onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </section>
    </div>
  );
}
