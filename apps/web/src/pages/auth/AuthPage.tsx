import { useState } from "react";

import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

type AuthMode = "login" | "register";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  if (mode === "register") {
    return <RegisterPage onSwitchToLogin={() => setMode("login")} />;
  }

  return <LoginPage onSwitchToRegister={() => setMode("register")} />;
}
