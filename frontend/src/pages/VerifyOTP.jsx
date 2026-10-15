import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import Spinner from "../components/Spinner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { parseApiError } from "../services/api.js";
import { ROLE_HOME } from "../routes/ProtectedRoute.jsx";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyLoginOTP, resendLoginOTP } = useAuth();
  const toast = useToast();
  const challengeId = location.state?.challengeId;
  const emailHint = location.state?.emailHint || "your registered email";
  const remember = !!location.state?.remember;
  const destination = location.state?.from?.pathname;

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(60);

  useEffect(() => {
    if (!challengeId) {
      navigate("/login", { replace: true, state: { message: "Please sign in to request a verification code." } });
    }
  }, [challengeId, navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    setBusy(true);
    try {
      const user = await verifyLoginOTP({ challenge_id: challengeId, code, remember });
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(destination || ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      const result = parseApiError(err);
      setError(result.message);
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setError("");
    setResending(true);
    try {
      const result = await resendLoginOTP(challengeId);
      toast.success(result.message || "A new code has been sent.");
      setResendSeconds(60);
      setCode("");
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify it's you"
      subtitle={`Enter the six-digit code sent to ${emailHint}. The code expires in five minutes.`}
      footer={<>Wrong email? <Link to="/login">Go back to sign in</Link></>}
    >
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <form onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label-like" htmlFor="otp-code">Email verification code</label>
          <input
            id="otp-code"
            className="input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            aria-describedby="otp-help"
            autoFocus
          />
          <small id="otp-help">For your security, you have up to five incorrect attempts.</small>
        </div>
        <button className="btn btn-primary btn-block" disabled={busy || !challengeId}>
          {busy ? <><Spinner /> Verifying…</> : "Verify and Sign In"}
        </button>
      </form>
      <div className="otp-resend">
        {resendSeconds > 0 ? (
          <p className="small">You can request another code in {resendSeconds}s.</p>
        ) : (
          <button type="button" className="btn btn-secondary btn-block" onClick={onResend} disabled={resending}>
            {resending ? <><Spinner /> Sending…</> : "Resend code"}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
