importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

self.addEventListener("notificationclick", function (event) {
  const d = (event && event.notification && event.notification.data) || {};
  const origin = self.location && self.location.origin ? self.location.origin : "";
  const target = d.url || d.link || (d.route ? new URL(d.route, origin).href : origin);
  event.notification && event.notification.close && event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(target, origin).href;
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        try {
          if (client.url === url && "focus" in client) return client.focus();
        } catch (e) {}
      }
      for (const client of clientList) {
        try {
          if ("navigate" in client) await client.navigate(url);
          if ("focus" in client) return client.focus();
        } catch (e) {}
      }
      if (clients.openWindow) return clients.openWindow(url);
    })()
  );
});