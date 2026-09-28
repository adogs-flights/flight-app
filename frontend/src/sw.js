import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { safeNotificationUrl } from './utils/notificationUrl';

// Cache only build-time public assets. Authenticated API/file responses stay network-only.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Let an update activate naturally after existing tabs close; avoid interrupting forms.
self.addEventListener('push', event => {
    let payload = {};
    try { payload = event.data?.json() || {}; } catch { /* Fall back to a useful visible notification. */ }
    event.waitUntil(self.registration.showNotification(
        typeof payload.title === 'string' ? payload.title : '해봉티켓',
        {
            body: typeof payload.body === 'string' ? payload.body : '새로운 알림이 있습니다.',
            icon: '/pwa-192.png',
            data: { url: new URL(safeNotificationUrl(payload.url, self.location.origin)).pathname },
        },
    ));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    const target = safeNotificationUrl(event.notification.data?.url, self.location.origin);
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (new URL(client.url).origin === self.location.origin) {
                try {
                    const navigated = await client.navigate(target);
                    if (navigated) { await navigated.focus(); return; }
                } catch { /* A closing tab should not prevent opening the destination. */ }
            }
        }
        await self.clients.openWindow(target);
    })());
});
