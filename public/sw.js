// TeamComms Web Push Service Worker
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'TeamComms • New Message';
  const options = {
    body: data.body || 'You received a new message in TeamComms',
    icon: data.icon || '/logo.png',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'teamcomms-msg',
    renotify: true,
    data: data.data || { url: '/messenger' },
    vibrate: [150, 80, 150],
    actions: [
      { action: 'open', title: 'Open TeamComms' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/messenger';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus and navigate it
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url.includes('/messenger')) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // If no window is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
