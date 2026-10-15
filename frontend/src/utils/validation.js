const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => EMAIL_RE.test(v.trim());

/** 0-4 score + label + checklist used by the strength meter and by validation. */
export function passwordStrength(pw) {
  const checks = {
    length: pw.length >= 8,
    letter: /[a-z]/i.test(pw),
    number: /\d/.test(pw),
    mixed: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  let score = 0;
  if (checks.length) score++;
  if (checks.number && checks.letter) score++;
  if (checks.mixed) score++;
  if (checks.symbol && pw.length >= 10) score++;
  if (!checks.length) score = Math.min(score, 1);
  const label = pw.length === 0 ? "" : score <= 1 ? "Weak" : score <= 3 ? "Medium" : "Strong";
  return { score, label, checks };
}

export function validateLogin({ email, password }) {
  const e = {};
  if (!email.trim()) e.email = "Email is required.";
  else if (!isEmail(email)) e.email = "Enter a valid email address.";
  if (!password) e.password = "Password is required.";
  return e;
}

export function validateRegister({ name, email, password, confirm_password, role, terms }) {
  const e = {};
  if (!name.trim()) e.name = "Full name is required.";
  if (!email.trim()) e.email = "Email is required.";
  else if (!isEmail(email)) e.email = "Enter a valid email address.";
  if (!password) e.password = "Password is required.";
  else if (passwordStrength(password).score < 2) e.password = "Use 8+ characters with letters and numbers.";
  if (!confirm_password) e.confirm_password = "Please confirm your password.";
  else if (password !== confirm_password) e.confirm_password = "Passwords do not match.";
  if (!["customer", "seller"].includes(role)) e.role = "Choose Customer or Seller.";
  if (!terms) e.terms = "You must accept the Terms & Conditions.";
  return e;
}
