import { useEffect, useRef, useState } from "react";
import "../styles/google.css";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => { scriptPromise = null; reject(new Error("Could not load Google Sign-In.")); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * "Continue with Google" button rendered by Google Identity Services.
 * onCredential(idToken) is called after the user picks an account.
 */
export default function GoogleButton({ onCredential, onError, text = "continue_with" }) {
  const holder = useRef(null);
  const callbackRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [state, setState] = useState(CLIENT_ID ? "loading" : "missing");

  callbackRef.current = onCredential;
  errorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => response?.credential && callbackRef.current?.(response.credential),
          ux_mode: "popup",
          auto_select: false,
        });
        const width = Math.min(400, Math.max(200, Math.floor(holder.current.offsetWidth || 340)));
        window.google.accounts.id.renderButton(holder.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          logo_alignment: "left",
          width,
        });
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setState("error");
        errorRef.current?.(err.message);
      });

    return () => { cancelled = true; };
  }, [text]);

  if (state === "missing") {
    return (
      <p className="google-note" role="note">
        Google sign-in is not configured. Add <code>VITE_GOOGLE_CLIENT_ID</code> to <code>frontend/.env</code>.
      </p>
    );
  }

  return (
    <div className="google-wrap">
      <div ref={holder} className="google-holder" />
      {state === "loading" && <div className="google-skeleton" aria-hidden="true">Loading Google…</div>}
    </div>
  );
}
