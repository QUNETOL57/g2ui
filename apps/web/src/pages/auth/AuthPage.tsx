import { useEffect, useState } from "react";

import { Modal } from "@shared/ui/Modal";

import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

export type AuthMode = "login" | "register";

interface AuthPageProps {
  open: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onAuthenticated?: () => Promise<void> | void;
}

export function AuthPage({
  open,
  initialMode = "login",
  onClose,
  onAuthenticated,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [initialMode, open]);

  if (mode === "register") {
    return (
      <Modal open={open} onClose={onClose} size="md">
        <RegisterPage
          onSwitchToLogin={() => setMode("login")}
          onAuthenticated={onAuthenticated}
        />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <LoginPage
        onSwitchToRegister={() => setMode("register")}
        onAuthenticated={onAuthenticated}
      />
    </Modal>
  );
}
