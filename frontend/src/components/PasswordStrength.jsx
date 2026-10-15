import { passwordStrength } from "../utils/validation.js";

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  const level = label.toLowerCase();
  return (
    <div className="strength" aria-live="polite">
      <div className="strength-bars">
        {[1, 2, 3, 4].map((i) => <span key={i} className={i <= score ? `on ${level}` : ""} />)}
      </div>
      <span className={`strength-label ${level}`}>{label}</span>
    </div>
  );
}
