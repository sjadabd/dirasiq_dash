importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

self.addEventListener("notificationclick", function (event) {
  const d = (event && event.notification && event.notification.data) || {};
  const origin = self.location && self.location.origin ? self.location.origin : "";
  let target = d.url || d.link || (d.route ? new URL(d.route, origin).href : origin);
  event.notification && event.notification.close && event.notification.close();
  event.waitUntil(
    (async () => {
      const urlObj = new URL(target, origin);
      // pass through notification id if present to allow marking read in app
      if (d.id && !urlObj.searchParams.has('notificationId')) {
        urlObj.searchParams.set('notificationId', d.id);
      }
      const url = urlObj.href;
      const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        try {
          if (client.url === url && "focus" in client) return client.focus();
        } catch (e) { }
      }
      for (const client of clientList) {
        try {
          if ("navigate" in client) await client.navigate(url);
          if ("focus" in client) return client.focus();
        } catch (e) { }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })()
  );
});
