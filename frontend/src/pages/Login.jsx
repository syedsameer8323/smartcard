import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import TextField from "../components/TextField.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import Spinner from "../components/Spinner.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { parseApiError } from "../services/api.js";
import { validateLogin } from "../utils/validation.js";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, googleLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = location.state?.message;

  const set = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const validationErrors = validateLogin(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      const result = await login({ email: form.email.trim(), password: form.password });
      if (result.otp_required && result.challenge_id) {
        navigate("/verify-otp", {
          replace: true,
          state: {
            challengeId: result.challenge_id,
            emailHint: result.email_hint,
            remember: form.remember,
            from: location.state?.from,
          },
        });
        return;
      }
      // Defensive fallback in case the API contract changes unexpectedly.
      throw new Error("The server did not start email verification. Please try again.");
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error);
      setFormError(error.message && !error.response ? error.message : message);
      setErrors(fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async (credential) => {
    setFormError("");
    try {
      const { user, created } = await googleLogin({ credential, remember: true });
      toast.success(created ? `Welcome to SmartCart, ${user.name.split(" ")[0]}!` : `Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(location.state?.from?.pathname || ROLE_HOME[user.role], { replace: true });
    } catch (error) {
      setFormError(parseApiError(error).message);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue your personalized shopping experience."
      footer={<>Don't have an account? <Link to="/register">Create Account</Link></>}
    >
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <TextField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set} error={errors.email} />
        <PasswordInput id="password" label="Password" autoComplete="current-password" value={form.password} onChange={set} error={errors.password} />
        <div className="row-between">
          <label className="check">
            <input type="checkbox" name="remember" checked={form.remember} onChange={set} />
            Remember me
          </label>
          <Link to="/forgot-password" className="small">Forgot Password?</Link>
        </div>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? <><Spinner /> Sending verification code…</> : "Continue"}
        </button>
      </form>

      <div className="auth-divider"><span>or</span></div>
      <GoogleButton onCredential={onGoogle} onError={setFormError} />
    </AuthLayout>
  );
}
