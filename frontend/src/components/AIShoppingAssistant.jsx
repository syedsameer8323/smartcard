import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import {
  sendAssistantMessage,
  getOrCreateGuestSessionKey,
  clearAssistantStorage,
  conversationStorageKey,
} from "../services/assistant.js";
import "../styles/chatbot.css";

const GREETING =
  "Hi! I'm SmartCart AI — your shopping assistant. Ask me to find products, compare options, check your cart, or get recommendations.";

const STARTERS = [
  "Show me products under ₹5,000",
  "Show fitness products",
  "Show festival offers",
  "What's in my cart?",
];

let nextId = 1;
const msg = (from, extra) => ({ id: nextId++, from, ...extra });

const ChatIcon = () => (
  <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {/* Soft orb */}
    <circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.12)" />
    {/* Shopping bag body */}
    <path
      d="M16 20.5h16c.8 0 1.4.6 1.5 1.4l1.2 12.2c.1 1.1-.7 2.1-1.9 2.1H15.2c-1.1 0-2-.9-1.9-2.1l1.2-12.2c.1-.8.7-1.4 1.5-1.4z"
      fill="currentColor"
      opacity="0.95"
    />
    {/* Bag handles */}
    <path
      d="M19.5 20.5v-2.2c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5v2.2"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      fill="none"
      opacity="0.95"
    />
    {/* AI sparkle */}
    <path
      d="M36.5 11.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1 1.1-2.4z"
      fill="#fff"
    />
    <path
      d="M12 12.5l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5z"
      fill="#fff"
      opacity="0.85"
    />
  </svg>
);
const CloseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7z" /><path d="M22 2 11 13" /></svg>
);
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></svg>
);
const ExpandIcon = ({ expanded }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    {expanded
      ? <path d="M9 9H4V4m11 5h5V4M9 15H4v5m11-5h5v5" />
      : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
);
const BotAvatar = () => (
  <span className="fq-avatar" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path
        d="M16 21h16c.8 0 1.4.6 1.5 1.4l1 10.8c.1 1.1-.7 2-1.9 2H15.4c-1.1 0-2-.9-1.9-2l1-10.8c.1-.8.7-1.4 1.5-1.4z"
        fill="currentColor"
      />
      <path
        d="M19.5 21v-1.8c0-2.3 1.9-4.2 4.5-4.2s4.5 1.9 4.5 4.2V21"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35 12l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9.9-1.9z"
        fill="currentColor"
        opacity="0.95"
      />
    </svg>
  </span>
);

function formatPrice(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function BotText({ text }) {
  const lines = (text || "").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        const isBullet = /^[-•*]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[-•*]\s+/, "") : line;
        if (isBullet) return <span key={i} className="fq-li">{renderInline(content)}</span>;
        if (!trimmed) return <span key={i} className="fq-line fq-gap" />;
        return <span key={i} className="fq-line">{renderInline(content)}</span>;
      })}
    </>
  );
}

function renderInline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    else parts.push(<code key={key++} className="fq-code">{token.slice(1, -1)}</code>);
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function ProductMiniCard({ product, onAdd }) {
  const { isAuthenticated } = useAuth();
  const price = product.sale_price ?? product.price;
  const list = product.price;
  const onSale = product.discount_percent != null && Number(product.sale_price) < Number(list);
  const out = product.stock === 0 || product.in_stock === false;
  const [state, setState] = useState("idle"); // idle | busy | done

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (out || state === "busy" || !onAdd) return;
    if (!isAuthenticated) {
      onAdd(null, "Please sign in to add items to your cart.");
      return;
    }
    setState("busy");
    const ok = await onAdd(product.id);
    setState(ok ? "done" : "idle");
    if (ok) window.setTimeout(() => setState("idle"), 1400);
  };

  return (
    <div className={`fq-pcard${out ? " is-out" : ""}`}>
      <Link to={`/product/${product.id}`} className="fq-pcard-link" aria-label={product.name}>
        <div className="fq-pcard-img">
          {product.image_url
            ? <img src={product.image_url} alt="" loading="lazy" draggable={false} />
            : <span className="fq-pcard-ph" aria-hidden="true">📦</span>}
          {onSale && (
            <span className="fq-pcard-badge">-{Math.round(Number(product.discount_percent))}%</span>
          )}
        </div>
        <div className="fq-pcard-body">
          <span className="fq-pcard-name">{product.name}</span>
          {product.category && <span className="fq-pcard-cat">{product.category}</span>}
          <span className="fq-pcard-price">
            {formatPrice(price)}
            {onSale && <s className="fq-pcard-list">{formatPrice(list)}</s>}
          </span>
          <span className={`fq-pcard-stock${out ? " out" : ""}`}>
            {out ? "Out of stock" : product.stock != null && product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}
          </span>
        </div>
      </Link>
      <button
        type="button"
        className={`fq-pcard-add${state === "done" ? " done" : ""}`}
        onClick={handleAdd}
        disabled={out || state === "busy"}
        aria-label={out ? "Out of stock" : `Add ${product.name} to cart`}
      >
        {state === "busy" ? <span className="fq-spin" /> : state === "done" ? <CheckIcon /> : <PlusIcon />}
      </button>
    </div>
  );
}

function freshGreeting() {
  return [msg("bot", { text: GREETING, chips: STARTERS })];
}

export default function AIShoppingAssistant() {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useShop();
  const { pathname } = useLocation();

  const userId = user?.id ?? null;
  const storageKey = conversationStorageKey(userId);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  useEffect(() => {
    const prev = prevUserIdRef.current;
    if (prev === userId) return;
    prevUserIdRef.current = userId;
    clearAssistantStorage();
    setConversationId("");
    setContextProductIds([]);
    setMessages(freshGreeting());
    setInput("");
    setTyping(false);
    typingRef.current = false;
  }, [userId]);

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
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [hidden, open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open, expanded]);

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        if (expanded) setExpanded(false);
        else setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, expanded]);

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

  const handleAddToCart = useCallback(async (productId, errMsg) => {
    if (errMsg) return false;
    if (!productId) return false;
    return addToCart(productId);
  }, [addToCart]);

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
          sessionKey: isAuthenticated ? undefined : getOrCreateGuestSessionKey(),
          productIds: contextProductIds,
        });

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
          sessionStorage.setItem(storageKey, data.conversation_id);
        }

        const products = data.products || [];
        const related = data.related || [];
        if (products.length) {
          setContextProductIds(products.map((p) => p.id).filter(Boolean));
        }

        setMessages((list) => [
          ...list,
          msg("bot", {
            text: data.reply || "Sorry, I could not process that.",
            products,
            related,
            chips: data.suggestions?.length ? data.suggestions : STARTERS,
          }),
        ]);
      } catch (err) {
        const detail = err?.response?.data?.detail || err?.message || "Unable to reach the assistant.";
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
    <div className={`fq-root${hasTabbar ? " has-tabbar" : ""}${open ? " is-open" : ""}${expanded ? " is-expanded" : ""}`}>
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
            <button type="button" className="fq-head-btn" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Collapse" : "Expand"}>
              <ExpandIcon expanded={expanded} />
            </button>
            <button type="button" className="fq-head-btn" onClick={restart} aria-label="New conversation">
              <RefreshIcon />
            </button>
            <button type="button" className="fq-head-btn" onClick={toggle} aria-label="Close assistant">
              <CloseIcon size={18} />
            </button>
          </header>

          <div className="fq-log" ref={logRef} role="log" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`fq-row ${m.from}`}>
                {m.from === "bot" && <BotAvatar />}
                <div className="fq-col">
                  {m.text && (
                    <div className="fq-bubble"><BotText text={m.text} /></div>
                  )}

                  {m.products?.length > 0 && (
                    <div className="fq-products">
                      {m.products.map((p) => (
                        <ProductMiniCard key={`${m.id}-${p.id}`} product={p} onAdd={handleAddToCart} />
                      ))}
                    </div>
                  )}

                  {m.related?.length > 0 && (
                    <div className="fq-related">
                      <div className="fq-related-title">You May Also Like</div>
                      <div className="fq-products">
                        {m.related.map((p) => (
                          <ProductMiniCard key={`${m.id}-rel-${p.id}`} product={p} onAdd={handleAddToCart} />
                        ))}
                      </div>
                    </div>
                  )}

                  {m.from === "bot" && m.id === lastBotId && !typing && m.chips?.length > 0 && (
                    <div className="fq-chips">
                      {m.chips.map((label) => (
                        <button type="button" key={label} className="fq-chip" onClick={() => pickChip(label)}>
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

          <form className="fq-form" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
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
            Live catalog · {isAuthenticated ? "Cart & orders available" : "Sign in for cart help"}
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
