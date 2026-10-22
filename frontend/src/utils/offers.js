// Festival presets shown to sellers. Dates change every year, so sellers pick the sale window themselves.
export const FESTIVALS = [
  { key: "diwali", label: "Diwali", emoji: "🪔", name: "Diwali Dhamaka", percent: 15 },
  { key: "dussehra", label: "Dussehra", emoji: "🏹", name: "Dussehra Special", percent: 10 },
  { key: "navratri", label: "Navratri", emoji: "💃", name: "Navratri Festive Sale", percent: 10 },
  { key: "holi", label: "Holi", emoji: "🎨", name: "Holi Colour Sale", percent: 10 },
  { key: "eid", label: "Eid", emoji: "🌙", name: "Eid Mubarak Sale", percent: 15 },
  { key: "christmas", label: "Christmas", emoji: "🎄", name: "Christmas Sale", percent: 20 },
  { key: "new_year", label: "New Year", emoji: "🎆", name: "New Year Sale", percent: 20 },
  { key: "republic_day", label: "Republic Day", emoji: "🇮🇳", name: "Republic Day Sale", percent: 26 },
  { key: "independence_day", label: "Independence Day", emoji: "🇮🇳", name: "Independence Day Sale", percent: 15 },
  { key: "raksha_bandhan", label: "Raksha Bandhan", emoji: "🎀", name: "Rakhi Special", percent: 10 },
  { key: "custom", label: "Custom sale", emoji: "✨", name: "", percent: 10 },
];

export const festivalOf = (key) => FESTIVALS.find((f) => f.key === key) || FESTIVALS[FESTIVALS.length - 1];

export const OFFER_STATUS = {
  live: "Live now",
  scheduled: "Scheduled",
  ended: "Ended",
  paused: "Paused",
};

/** "2026-10-21T14:30" for <input type="datetime-local">, in the browser's own time zone. */
export const toLocalInput = (date) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const percentText = (value) => `${Number(value)}%`;

/** Time left in a friendly form, e.g. "Ends in 2 days" / "Ends in 5 hours". */
export const endsIn = (iso) => {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "Ends in under an hour";
  if (hours < 24) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `Ends in ${days} day${days === 1 ? "" : "s"}`;
};
