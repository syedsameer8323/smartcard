import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import PasswordStrength from "../components/PasswordStrength.jsx";
import Spinner from "../components/Spinner.jsx";
import { authApi, parseApiError } from "../services/api.js";
import { passwordStrength } from "../utils/validation.js";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setErrors({}); };

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {};
    if (passwordStrength(form.password).score < 2) v.password = "Use 8+ characters with letters and numbers.";
    if (form.password !== form.confirm_password) v.confirm_password = "Passwords do not match.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true); setFormError("");
    try {
      await authApi.resetPassword({ uid: params.get("uid"), token: params.get("token"), ...form });
      navigate("/login", { replace: true, state: { message: "Password updated. You can now sign in." } });
    } catch (err) {
      const { message, fieldErrors } = parseApiError(err);
      setFormError(message); setErrors(fieldErrors);
    } finally { setSubmitting(false); }
  };

  if (!params.get("uid") || !params.get("token")) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is missing or malformed."
        footer={<Link to="/forgot-password">Request a new link</Link>} />
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it strong and unique."
      footer={<Link to="/login">← Back to login</Link>}>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <PasswordInput id="password" label="New password" autoComplete="new-password" value={form.password} onChange={set} error={errors.password}>
          <PasswordStrength password={form.password} />
        </PasswordInput>
        <PasswordInput id="confirm_password" label="Confirm password" autoComplete="new-password" value={form.confirm_password} onChange={set} error={errors.confirm_password} />
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? <><Spinner /> Updating…</> : "Update password"}
        </button>
      </form>
    </AuthLayout>
  );
}
