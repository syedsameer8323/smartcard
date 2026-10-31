import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  sendAssistantMessage,
  getOrCreateGuestSessionKey,
  clearAssistantStorage,
  conversationStorageKey,
} from "../services/assistant.js";
import "../styles/chatbot.css";

const GREETING =
  "Hi! I'm SmartCart AI — your shopping assistant. Ask me to find products, compare options, check your cart, or get recommendations based on what you're browsing.";

const STARTERS = [
  "Find a programming laptop under ₹60,000",
  "Show festival offers",
  "What's in my cart?",
  "Recommend something for me",
];

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

function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Lightweight markdown: bold, italics, inline code, bullets — no raw tables/URLs. */
function BotText({ text }) {
  const lines = (text || "").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isBullet = /^[-•*]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[-•*]\s+/, "") : line;
        const nodes = renderInline(content);
        if (isBullet) {
          return <span key={i} className="fq-li">{nodes}</span>;
        }
        if (!trimmed) {
          return <span key={i} className="fq-line fq-gap" />;
        }
        return <span key={i} className="fq-line">{nodes}</span>;
      })}
    </>
  );
}

function renderInline(text) {
  // Split on **bold**, *italic*, `code`
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("`")) {
      parts.push(<code key={key++} className="fq-code">{token.slice(1, -1)}</code>);
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function ProductMiniCard({ product }) {
  const price = product.sale_price ?? product.price;
  const list = product.price;
  const onSale =
    product.discount_percent != null &&
    Number(product.sale_price) < Number(list);
  const qty = product.quantity;

  return (
    <Link
      to={`/product/${product.id}`}
      className="fq-pcard"
      aria-label={`${product.name}, ${formatPrice(price)}`}
    >
      <div className="fq-pcard-img">
        {product.image_url ? (
          <img src={product.image_url} alt="" loading="lazy" draggable={false} />
        ) : (
          <span className="fq-pcard-ph" aria-hidden="true">📦</span>
        )}
      </div>
      <div className="fq-pcard-body">
        <span className="fq-pcard-name">{product.name}</span>
        <span className="fq-pcard-price">
          {formatPrice(price)}
          {onSale && <s className="fq-pcard-list">{formatPrice(list)}</s>}
          {qty != null && qty > 0 && (
            <span className="fq-pcard-qty">× {qty}</span>
          )}
        </span>
        {product.category && (
          <span className="fq-pcard-cat">{product.category}</span>
        )}
      </div>
    </Link>
  );
}

function freshGreeting() {
  return [msg("bot", { text: GREETING, chips: STARTERS })];
}

export default function AIShoppingAssistant() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  const userId = user?.id ?? null;
  const storageKey = conversationStorageKey(userId);

  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState(freshGreeting);
  const [hint, setHint] = useState(false);
  const [contextProductIds, setContextProductIds] = useState([]);

  const logRef = useRef(null);
  const inputRef = useRef(null);
  const prevUserIdRef = useRef(userId);
  const typingRef = useRef(false);

  const hidden =
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    (isAuthenticated && user?.role !== "customer");
  const hasTabbar = isAuthenticated && user?.role === "customer";

  // Reset conversation when auth identity changes (login / logout / switch account)
  useEffect(() => {
    const prev = prevUserIdRef.current;
    if (prev === userId) return;
    prevUserIdRef.current = userId;

    // Clear all assistant keys so no cross-user leakage
    clearAssistantStorage();
    setConversationId("");
    setContextProductIds([]);
    setMessages(freshGreeting());
    setInput("");
    setTyping(false);
    typingRef.current = false;
  }, [userId]);

  // Also clear on global auth:expired (token refresh failure)
  useEffect(() => {
    const onExpired = () => {
      clearAssistantStorage();
      setConversationId("");
      setContextProductIds([]);
      setMessages(freshGreeting());
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  useEffect(() => {
    if (hidden || open || sessionStorage.getItem("fq_hint_seen")) return undefined;
    const show = window.setTimeout(() => setHint(true), 3500);
    const hide = window.setTimeout(() => setHint(false), 11000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
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
    setOpen((v) => !v);
    setHint(false);
    sessionStorage.setItem("fq_hint_seen", "1");
  };

  const restart = () => {
    setTyping(false);
    typingRef.current = false;
    setConversationId("");
    sessionStorage.removeItem(storageKey);
    setContextProductIds([]);
    setMessages(freshGreeting());
    setInput("");
  };

  const ask = useCallback(
    async (text) => {
      const clean = text.trim().slice(0, 1000);
      if (!clean || typingRef.current) return;

      typingRef.current = true;
      setMessages((list) => [...list, msg("user", { text: clean })]);
      setInput("");
      setTyping(true);

      try {
        const data = await sendAssistantMessage({
          message: clean,
          conversationId: conversationId || undefined,
          // Only send guest session key when not authenticated
          sessionKey: isAuthenticated ? undefined : getOrCreateGuestSessionKey(),
          productIds: contextProductIds,
        });

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          sessionStorage.setItem(storageKey, data.conversation_id);
        }

        const products = data.products || [];
        if (products.length) {
          setContextProductIds(products.map((p) => p.id).filter(Boolean));
        }

        setMessages((list) => [
          ...list,
          msg("bot", {
            text: data.reply || "Sorry, I could not process that.",
            products,
            chips: data.suggestions?.length ? data.suggestions : STARTERS,
          }),
        ]);
      } catch (err) {
        const detail =
          err?.response?.data?.detail ||
          err?.message ||
          "Unable to reach the assistant. Please try again.";
        setMessages((list) => [
          ...list,
          msg("bot", {
            text: typeof detail === "string" ? detail : "Something went wrong. Please try again.",
            chips: STARTERS,
          }),
        ]);
      } finally {
        typingRef.current = false;
        setTyping(false);
      }
    },
    [conversationId, contextProductIds, isAuthenticated, storageKey],
  );

  const pickChip = (label) => {
    if (typingRef.current) return;
    ask(label);
  };

  if (hidden) return null;

  const lastBotId = [...messages].reverse().find((m) => m.from === "bot")?.id;

  return (
    <div className={`fq-root${hasTabbar ? " has-tabbar" : ""}${open ? " is-open" : ""}`}>
      {open && (
        <section className="fq-panel" role="dialog" aria-label="SmartCart AI shopping assistant">
          <header className="fq-head">
            <BotAvatar />
            <div className="fq-head-text">
              <b>SmartCart AI</b>
              <small>
                <span className="fq-online" />
                {isAuthenticated ? "Online · Signed in" : "Online · Guest"}
              </small>
            </div>
            <button type="button" className="fq-head-btn" onClick={restart} aria-label="New conversation">
              <RefreshIcon />
            </button>
            <button type="button" className="fq-head-btn" onClick={toggle} aria-label="Close assistant">
              <CloseIcon size={19} />
            </button>
          </header>

          <div className="fq-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`fq-row ${m.from}`}>
                {m.from === "bot" && <BotAvatar />}
                <div className="fq-col">
                  {m.text && (
                    <div className="fq-bubble">
                      <BotText text={m.text} />
                    </div>
                  )}

                  {m.products?.length > 0 && (
                    <div className="fq-products">
                      {m.products.map((p) => (
                        <ProductMiniCard key={`${m.id}-${p.id}`} product={p} />
                      ))}
                    </div>
                  )}

                  {m.from === "bot" && m.id === lastBotId && !typing && m.chips?.length > 0 && (
                    <div className="fq-chips">
                      {m.chips.map((label) => (
                        <button
                          type="button"
                          key={label}
                          className="fq-chip"
                          onClick={() => pickChip(label)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="fq-row bot">
                <BotAvatar />
                <div className="fq-bubble fq-typing" aria-label="Assistant is typing">
                  <i /><i /><i />
                </div>
              </div>
            )}
          </div>

          <form
            className="fq-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, cart, offers…"
              maxLength={1000}
              aria-label="Message SmartCart AI"
              autoComplete="off"
            />
            <button type="submit" className="fq-send" disabled={!input.trim() || typing} aria-label="Send">
              <SendIcon />
            </button>
          </form>
          <p className="fq-note">
            Live catalog data ·{" "}
            {isAuthenticated
              ? "Signed in — cart & orders available"
              : "Sign in for cart & order help"}
          </p>
        </section>
      )}

      {hint && !open && (
        <div className="fq-hint" role="status">Need product help? Ask AI</div>
      )}

      <button
        type="button"
        className="fq-launcher"
        onClick={toggle}
        aria-label={open ? "Close AI assistant" : "Open AI shopping assistant"}
        aria-expanded={open}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
