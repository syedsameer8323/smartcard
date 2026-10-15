import { useState } from "react";

export default function PasswordInput({ id, label, value, onChange, error, autoComplete, children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id} name={id} type={show ? "text" : "password"} value={value} onChange={onChange}
          autoComplete={autoComplete} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className={error ? "has-error" : ""}
        />
        <button type="button" className="toggle-vis" onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {children}
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
