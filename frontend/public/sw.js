self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || "You have a new SmartCart update." }; }
  event.waitUntil(self.registration.showNotification(data.title || "SmartCart update", {
    body: data.body || "You have a new seller notification.",
    icon: "/favicon.svg",
    data: { url: data.url || "/seller/orders" },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/seller/orders";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) { existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
