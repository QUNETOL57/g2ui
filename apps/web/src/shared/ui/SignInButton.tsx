import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";

import styles from "./SignInButton.module.css";

interface SignInButtonProps {
  onClick: () => void;
}

export function SignInButton({ onClick }: SignInButtonProps) {
  return (
    <button type="button" className={styles.signInButton} onClick={onClick}>
      <LoginOutlinedIcon fontSize="small" aria-hidden />
      Sign in
    </button>
  );
}
