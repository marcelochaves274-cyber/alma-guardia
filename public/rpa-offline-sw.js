importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyARUFMEZXmZRD2GJEbQb4BrthjiVHc-mSA',
  authDomain: 'brave-drive-472322-m2.firebaseapp.com',
  projectId: 'brave-drive-472322-m2',
  storageBucket: 'brave-drive-472322-m2.firebasestorage.app',
  messagingSenderId: '768402541625',
  appId: '1:768402541625:web:cf3ae4a28647d60c9491e8',
});

const firebaseMessaging = firebase.messaging();

firebaseMessaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  return self.registration.showNotification(notification.title || 'ALMA Guardia', {
    body: notification.body || 'Você tem novos alertas críticos.',
    icon: notification.icon || '/icon-192x192.png',
    tag: notification.tag || 'alma-guardia-critical-alerts',
    data: { url: payload.fcmOptions?.link || '/dashboard' },
    requireInteraction: true,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/dashboard'));
});

const CACHE_NAME = 'alma-guardi-rpa-v8';
const CORE_ASSETS = ['/', '/dashboard', '/login', '/manifest.json', '/icon-192x192.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('sync', event => {
  if (event.tag !== 'rpa-offline-sync') return;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'RPA_SYNC_REQUEST' });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put('/shell-fallback', copy.clone());
            cache.put(request.url, copy);
          });
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match(request.url)
            || await cache.match('/shell-fallback')
            || await cache.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && (response.type === 'basic' || url.origin === self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
