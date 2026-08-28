const CACHE_NAME = "mercadia-shell-v9";
const APP_SHELL = [
  "/",
  "/landing.html",
  "/platform.html",
  "/index.html",
  "/products.html",
  "/categorias.html",
  "/mi-cuenta.html",
  "/admin/login.html",
  "/admin/dashboard.html",
  "/admin/orders.html",
  "/admin/css/commerce-os.css",
  "/admin/js/auth.js",
  "/admin/js/ui.js",
  "/css/styles.css",
  "/css/platform.css",
  "/config.js",
  "/icons/mercadia-app.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  if(url.pathname === "/config.js"){
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if(event.request.mode === "navigate"){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(response => response || caches.match("/index.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

self.addEventListener("push", event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(
      data.title || "Mercadia",
      {
        body: data.body || "Tienes una nueva actualizacion.",
        icon: "/icons/mercadia-app.png",
        badge: "/icons/mercadia-app.png",
        tag: data.tag || "mercadia-update",
        renotify: true,
        data: {
          url: data.url || "/mi-cuenta.html"
        }
      }
    )
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/mi-cuenta.html",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(client => client.url.startsWith(self.location.origin));
        if(existing){
          existing.navigate(target);
          return existing.focus();
        }
        return self.clients.openWindow(target);
      })
  );
});
