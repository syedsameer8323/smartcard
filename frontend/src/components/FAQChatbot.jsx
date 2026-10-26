import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { FAQS, STARTER_IDS, SUPPORT_EMAIL, answerFor } from "./faqData.js";
import "../styles/chatbot.css";

const GREETING = "Hi! I’m the SmartCart assistant. Ask me about orders, payments, refunds, coupons or your account — or pick a topic below.";
const FALLBACK = `I couldn’t find an answer to that. Try one of the topics below, or email ${SUPPORT_EMAIL} and our team will help.`;

const byId = (id) => FAQS.find((faq) => faq.id === id);
let nextId = 1;
const msg = (from, extra) => ({ id: nextId++, from, ...extra });

const ChatIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.4-.7L3 21l1.9-5.1A8.4 8.4 0 1 1 21 11.5z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.4" />
  </svg>
);
const CloseIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></svg>
);
const RefreshIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></svg>
);
const BotAvatar = () => (
  <span className="fq-avatar" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4M9 14h.01M15 14h.01" /></svg>
  </span>
);

function BotText({ text }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.startsWith("• ")
          ? <span key={i} className="fq-li">{line.slice(2)}</span>
          : <span key={i} className="fq-line">{line}</span>,
      )}
    </>
  );
}

export default function FAQChatbot() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(() => [msg("bot", { text: GREETING, chips: STARTER_IDS })]);
  const [hint, setHint] = useState(false);

  const logRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);

  // Sellers and admins have their own dashboards; the shopper FAQ is for customers and visitors.
  const hidden = pathname.startsWith("/seller") || pathname.startsWith("/admin") || (isAuthenticated && user?.role !== "customer");
  const hasTabbar = isAuthenticated && user?.role === "customer";

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (hidden || open || sessionStorage.getItem("fq_hint_seen")) return undefined;
    const show = window.setTimeout(() => setHint(true), 4000);
    const hide = window.setTimeout(() => setHint(false), 12000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [hidden, open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggle = () => {
    setOpen((value) => !value);
    setHint(false);
    sessionStorage.setItem("fq_hint_seen", "1");
  };

  const reply = useCallback((result) => {
    setTyping(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setTyping(false);
      if (result.type === "faq") {
        const { faq } = result;
        setMessages((list) => [...list, msg("bot", { text: faq.answer, action: faq.action, chips: faq.related })]);
      } else if (result.type === "text") {
        setMessages((list) => [...list, msg("bot", { text: result.text, chips: STARTER_IDS })]);
      } else {
        setMessages((list) => [...list, msg("bot", { text: FALLBACK, chips: STARTER_IDS })]);
      }
    }, 550);
  }, []);

  const ask = (text) => {
    const clean = text.trim().slice(0, 200);
    if (!clean || typing) return;
    setMessages((list) => [...list, msg("user", { text: clean })]);
    setInput("");
    reply(answerFor(clean));
  };

  const pick = (id) => {
    const faq = byId(id);
    if (!faq || typing) return;
    setMessages((list) => [...list, msg("user", { text: faq.question })]);
    reply({ type: "faq", faq });
  };

  const restart = () => {
    window.clearTimeout(timer.current);
    setTyping(false);
    setMessages([msg("bot", { text: GREETING, chips: STARTER_IDS })]);
    setInput("");
  };

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  if (hidden) return null;

  const lastBotId = [...messages].reverse().find((m) => m.from === "bot")?.id;

  return (
    <div className={`fq-root${hasTabbar ? " has-tabbar" : ""}${open ? " is-open" : ""}`}>
      {open && (
        <section className="fq-panel" role="dialog" aria-label="SmartCart help assistant">
          <header className="fq-head">
            <BotAvatar />
            <div className="fq-head-text">
              <b>SmartCart Assistant</b>
              <small><span className="fq-online" />Online · Instant answers</small>
            </div>
            <button type="button" className="fq-head-btn" onClick={restart} aria-label="Restart conversation" title="Restart"><RefreshIcon /></button>
            <button type="button" className="fq-head-btn" onClick={toggle} aria-label="Close assistant" title="Close"><CloseIcon size={19} /></button>
          </header>

          <div className="fq-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`fq-row ${m.from}`}>
                {m.from === "bot" && <BotAvatar />}
                <div className="fq-col">
                  <div className="fq-bubble"><BotText text={m.text} /></div>
                  {m.action && (
                    <button type="button" className="fq-action" onClick={() => go(m.action.to)}>{m.action.label} →</button>
                  )}
                  {m.from === "bot" && m.id === lastBotId && !typing && m.chips?.length > 0 && (
                    <div className="fq-chips">
                      {m.chips.map((id) => byId(id) && (
                        <button type="button" key={id} className="fq-chip" onClick={() => pick(id)}>{byId(id).question}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="fq-row bot">
                <BotAvatar />
                <div className="fq-bubble fq-typing" aria-label="Assistant is typing"><i /><i /><i /></div>
              </div>
            )}
          </div>

          <form className="fq-form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              maxLength={200}
              aria-label="Type your question"
              autoComplete="off"
            />
            <button type="submit" className="fq-send" disabled={!input.trim() || typing} aria-label="Send"><SendIcon /></button>
          </form>
          <p className="fq-note">Automated assistant · For anything else, email {SUPPORT_EMAIL}</p>
        </section>
      )}

      {hint && !open && <div className="fq-hint" role="status">Need help? Ask me 👋</div>}

      <button type="button" className="fq-launcher" onClick={toggle} aria-label={open ? "Close help assistant" : "Open help assistant"} aria-expanded={open}>
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
