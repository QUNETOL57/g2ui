import { useState, type FormEvent } from "react";

import { useSessionStore } from "@entities/session/model/store";
import { BrandLogo } from "@shared/ui/BrandLogo";
import { Button } from "@shared/ui/Button";
import { Field } from "@shared/ui/Field";
import { Input } from "@shared/ui/Input";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";

import styles from "./AuthPage.module.css";
import { parseAuthError } from "./lib/auth-errors";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const login = useSessionStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
    } catch (submitError) {
      setError(parseAuthError(submitError, "Unable to sign in"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <BrandLogo />
          <h1 className={styles.title}>Sign in</h1>
          <p className={styles.subtitle}>Use your email and password to access your projects.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field label="Password">
            <div className={styles.passwordField}>
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
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

          {error ? <p className={styles.errorBanner}>{error}</p> : null}

          <div className={styles.actions}>
            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>

        <p className={styles.switchMode}>
          No account yet?{" "}
          <button type="button" className={styles.switchButton} onClick={onSwitchToRegister}>
            Create one
          </button>
        </p>
      </section>
    </div>
  );
}
