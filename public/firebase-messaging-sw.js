importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config injected at build time via env — fallback to empty for local dev without FCM
firebase.initializeApp({
  apiKey: "fake",
  authDomain: "fake",
  projectId: "energyops-504210",
  storageBucket: "fake",
  messagingSenderId: "fake",
  appId: "fake",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Fillo Console";
  const body = payload.notification?.body || payload.data?.body || "";
  const link = payload.data?.link || payload.data?.url || "/";
  self.registration.showNotification(title, {
    body,
    icon: "/vite.svg",
    data: { link },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link.startsWith("/") ? self.location.origin + link : link);
    }),
  );
});
