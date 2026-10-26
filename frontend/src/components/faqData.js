// Knowledge base for the SmartCart FAQ chatbot.
// To add or edit a question, change an entry below — no other code needs to change.
//   id        unique key (used by `related`)
//   question  text shown on the quick-reply chip
//   keywords  words/phrases that trigger this answer (multi-word phrases score higher)
//   answer    reply text. Lines starting with "• " render as bullets; "\n" starts a new line.
//   action    optional button: { label, to } where `to` is an in-app route
//   related   ids of follow-up questions suggested after the answer

export const SUPPORT_EMAIL = "support@smartcart.example";

export const FAQS = [
  {
    id: "track",
    question: "How do I track my order?",
    keywords: ["track", "tracking", "where is my order", "order status", "status", "shipped", "out for delivery", "delivery status", "my order"],
    answer:
      "Open My Orders to see live progress for every item. Each item moves through:\n• Placed → Confirmed → Processing → Shipped → Out for delivery → Delivered\nTap “View history” under an item to see the date and time of each step. You also get email updates as your order moves along.",
    action: { label: "Go to My Orders", to: "/orders" },
    related: ["delivery", "cancel"],
  },
  {
    id: "cancel",
    question: "Can I cancel my order?",
    keywords: ["cancel", "cancellation", "cancelling", "stop my order", "dont want", "changed my mind"],
    answer:
      "Yes — you can cancel while the seller hasn’t started preparing it (status Placed or Confirmed).\n• Go to My Orders and tap “Cancel order”\n• Pick a reason and confirm\nOnce an order is Processing or Shipped it can no longer be cancelled. If you paid online, your refund starts automatically.",
    action: { label: "Go to My Orders", to: "/orders" },
    related: ["refund", "return"],
  },
  {
    id: "refund",
    question: "When will I get my refund?",
    keywords: ["refund", "money back", "refunded", "reimburse", "refund status", "get my money"],
    answer:
      "Refunds for cancelled, paid orders go back to your original payment method within 5–7 business days. If you hadn’t paid yet (for example Cash on Delivery), nothing is charged. Any coupon used on a fully cancelled order is released as well.",
    related: ["cancel", "payment"],
  },
  {
    id: "payment",
    question: "Which payment methods are accepted?",
    keywords: ["payment", "pay", "payment method", "cod", "cash on delivery", "upi", "card", "netbanking", "razorpay", "online payment"],
    answer:
      "At checkout you can choose:\n• Online payment — processed securely by Razorpay (the available options are shown at checkout)\n• Cash on Delivery — pay when your order arrives\nSmartCart never sees your full card details.",
    related: ["payfail", "refund"],
  },
  {
    id: "payfail",
    question: "My payment failed — what now?",
    keywords: ["payment failed", "failed", "retry payment", "money deducted", "deducted", "payment pending", "payment not working", "unpaid"],
    answer:
      "No problem — open My Orders and tap “Retry payment” on that order to try again. If money was deducted but the order still shows unpaid, please wait a few minutes for it to update. If it doesn’t, contact us at " +
      SUPPORT_EMAIL +
      " with your order ID.",
    action: { label: "Go to My Orders", to: "/orders" },
    related: ["payment", "contact"],
  },
  {
    id: "coupon",
    question: "How do I use a coupon?",
    keywords: ["coupon", "promo", "promo code", "discount code", "voucher", "apply code", "code not working"],
    answer:
      "Enter your code in the Coupon box at checkout and tap Apply — the discount appears in your order summary straight away. Coupons can have a minimum order value or an expiry date set by the seller, so if one doesn’t apply, check its conditions.",
    action: { label: "Open my cart", to: "/cart" },
    related: ["offers", "payment"],
  },
  {
    id: "offers",
    question: "How do festival offers work?",
    keywords: ["offer", "offers", "festival", "sale", "deal", "deals", "discount", "price drop"],
    answer:
      "Festival offers are applied automatically — look for the offer tag and the crossed-out original price on a product. The price you see is the price you pay, and your order shows how much you saved. Offers are limited-time, so they can end without notice.",
    action: { label: "Browse the shop", to: "/shop" },
    related: ["coupon", "shipping"],
  },
  {
    id: "shipping",
    question: "Are there shipping charges?",
    keywords: ["shipping", "shipping fee", "delivery charge", "delivery fee", "free delivery", "free shipping", "charges"],
    answer:
      "Shipping is currently free on SmartCart orders. Your checkout summary shows the exact subtotal, discount, shipping and total before you pay.",
    related: ["delivery", "payment"],
  },
  {
    id: "delivery",
    question: "How long will delivery take?",
    keywords: ["delivery time", "how long", "when will", "arrive", "delivery", "estimated", "eta", "delayed", "late"],
    answer:
      "Delivery time depends on the seller and your location. Watch your item’s tracker in My Orders — once it says “Out for delivery”, it’s on its way to you. If an order seems delayed, email " +
      SUPPORT_EMAIL +
      " with your order ID and we’ll help.",
    action: { label: "Track my order", to: "/orders" },
    related: ["track", "contact"],
  },
  {
    id: "return",
    question: "Returns & replacements",
    keywords: ["return", "returns", "replace", "replacement", "exchange", "damaged", "wrong item", "defective", "broken"],
    answer:
      "If an item arrives damaged, defective or isn’t what you ordered, email " +
      SUPPORT_EMAIL +
      " with your order ID and a photo, and our team will sort it out. If the order hasn’t shipped yet, the quickest option is to cancel it from My Orders.",
    related: ["cancel", "contact"],
  },
  {
    id: "login",
    question: "How does sign-in work?",
    keywords: ["login", "log in", "sign in", "signin", "otp", "verification code", "code not received", "no code", "verify"],
    answer:
      "Sign in with your email and password, then enter the 6-digit code we email you. The code expires in 5 minutes, and you can request a new one after 60 seconds. Prefer it faster? Tap “Continue with Google” on the sign-in page. Check your spam folder if the code doesn’t arrive.",
    action: { label: "Go to sign in", to: "/login" },
    related: ["google", "password"],
  },
  {
    id: "google",
    question: "Can I sign in with Google?",
    keywords: ["google", "gmail", "continue with google", "sign in with google", "login with google", "google login", "google sign in"],
    answer:
      "Yes. Tap “Continue with Google” on the sign-in page and choose your account. If you’re new, we’ll create a customer account for you automatically — no password or email code needed.",
    action: { label: "Go to sign in", to: "/login" },
    related: ["login", "account"],
  },
  {
    id: "password",
    question: "I forgot my password",
    keywords: ["forgot", "forgot password", "reset password", "change password", "password reset", "cant remember", "password"],
    answer:
      "Use “Forgot Password?” on the sign-in page. Enter your email and we’ll send a reset link. If you signed up with Google, you can keep using Google — or set a password the same way.",
    action: { label: "Reset my password", to: "/forgot-password" },
    related: ["login", "google"],
  },
  {
    id: "account",
    question: "How do I create an account or sell?",
    keywords: ["register", "sign up", "signup", "create account", "new account", "seller", "become a seller", "sell on smartcart", "sell products", "sell my products", "join"],
    answer:
      "Tap Create Account and choose Customer to shop or Seller to list your own products. Sellers get a dashboard for products, orders, coupons and festival offers.",
    action: { label: "Create an account", to: "/register" },
    related: ["login", "google"],
  },
  {
    id: "cart",
    question: "Cart, wishlist & saved addresses",
    keywords: ["cart", "wishlist", "save for later", "saved", "address", "shipping address", "change address", "checkout"],
    answer:
      "• Tap the heart on a product to save it to your Wishlist\n• Add items to your Cart and adjust quantities there\n• At checkout you can save an address and reuse it next time",
    action: { label: "Open my cart", to: "/cart" },
    related: ["coupon", "payment"],
  },
  {
    id: "stock",
    question: "An item is out of stock",
    keywords: ["out of stock", "stock", "unavailable", "sold out", "restock", "low stock", "available"],
    answer:
      "Products marked “Out of stock” can’t be ordered right now, and “Low stock” means only a few are left. Save the product to your Wishlist so it’s easy to find again when the seller restocks.",
    action: { label: "Browse the shop", to: "/shop" },
    related: ["cart", "offers"],
  },
  {
    id: "contact",
    question: "Contact support",
    keywords: ["contact", "support", "help", "human", "agent", "customer care", "complaint", "email", "talk to someone", "speak"],
    answer:
      "We’re happy to help. Email us at " +
      SUPPORT_EMAIL +
      " and include your order ID (for example from My Orders) so we can get to the answer faster.",
    related: ["track", "return"],
  },
];

export const STARTER_IDS = ["track", "cancel", "refund", "payment", "coupon", "contact"];

const SMALL_TALK = [
  { test: /^(hi|hii|hello|hey|hola|good (morning|afternoon|evening)|namaste)\b/, reply: "Hi there! 👋 I can help with orders, payments, refunds, coupons and your account. What would you like to know?" },
  { test: /\b(thanks|thank you|thx|ty|great|awesome|perfect)\b/, reply: "You’re welcome! Anything else I can help with?" },
  { test: /\b(bye|goodbye|see you)\b/, reply: "Goodbye! Happy shopping with SmartCart. 🛍️" },
];

const stem = (word) => word.replace(/(ing|ed|es|s)$/, "");
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Returns { type: "faq", faq } | { type: "text", text } | { type: "none" } for a user's message. */
export function answerFor(input) {
  const text = normalize(input);
  if (!text) return { type: "none" };

  const tokens = text.split(" ").map(stem);
  let best = null;
  let bestScore = 0;

  for (const faq of FAQS) {
    let score = 0;
    for (const raw of faq.keywords) {
      const keyword = normalize(raw);
      if (keyword.includes(" ")) {
        if (text.includes(keyword)) score += 4;
      } else if (tokens.includes(stem(keyword))) {
        score += 2;
      }
    }
    if (normalize(faq.question) === text) score += 10;
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }

  if (best && bestScore >= 2) return { type: "faq", faq: best };

  const chat = SMALL_TALK.find((entry) => entry.test.test(text));
  if (chat) return { type: "text", text: chat.reply };
  return { type: "none" };
}
