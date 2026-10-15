import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import TextField from "../components/TextField.jsx";
import Spinner from "../components/Spinner.jsx";
import { authApi, parseApiError } from "../services/api.js";
import { isEmail } from "../utils/validation.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) return setError("Enter a valid email address.");
    setSubmitting(true); setError("");
    try { await authApi.forgotPassword(email.trim()); setSent(true); }
    catch (err) { setError(parseApiError(err).message); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll send you a reset link."
      footer={<Link to="/login">← Back to login</Link>}>
      {sent ? (
        <div className="alert alert-success" role="status">If an account exists for that email, a reset link has been sent. Check your inbox.</div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <TextField id="email" label="Email" type="email" value={email} error={error}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? <><Spinner /> Sending…</> : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
