import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import TextField from "../components/TextField.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import PasswordStrength from "../components/PasswordStrength.jsx";
import Spinner from "../components/Spinner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { parseApiError } from "../services/api.js";
import { validateRegister } from "../utils/validation.js";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "", role: "customer", terms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setSubmitting(true);
    try {
      const { terms, ...payload } = form;
      await register({
        ...payload,
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
      });
      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Check your inbox for a welcome email, then sign in." },
      });
    } catch (error) {
      const { message, fieldErrors } = parseApiError(error);
      setFormError(message);
      setErrors(fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join SmartCart and start discovering products made for you."
      footer={<>Already have an account? <Link to="/login">Login</Link></>}
    >
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}
      <form onSubmit={onSubmit} noValidate>
        <TextField id="name" label="Full Name" autoComplete="name" value={form.name} onChange={set} error={errors.name} />
        <TextField id="email" label="Email" type="email" autoComplete="email" value={form.email} onChange={set} error={errors.email} />
        <div className="field">
          <span className="label-like">I want to</span>
          <div className="role-pick" role="radiogroup" aria-label="Account type">
            {[["customer", "Shop", "Customer"], ["seller", "Sell", "Seller"]].map(([value, verb, label]) => (
              <label key={value} className={`role-option ${form.role === value ? "active" : ""}`}>
                <input type="radio" name="role" value={value} checked={form.role === value} onChange={set} />
                <b>{verb}</b><small>{label}</small>
              </label>
            ))}
          </div>
          {errors.role && <p className="field-error">{errors.role}</p>}
        </div>
        <PasswordInput id="password" label="Password" autoComplete="new-password" value={form.password} onChange={set} error={errors.password}>
          <PasswordStrength password={form.password} />
        </PasswordInput>
        <PasswordInput id="confirm_password" label="Confirm Password" autoComplete="new-password" value={form.confirm_password} onChange={set} error={errors.confirm_password} />
        <label className="check">
          <input type="checkbox" name="terms" checked={form.terms} onChange={set} />
          <span>I agree to the <a href="#terms">Terms &amp; Conditions</a></span>
        </label>
        {errors.terms && <p className="field-error">{errors.terms}</p>}
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? <><Spinner /> Creating account…</> : "Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
}
