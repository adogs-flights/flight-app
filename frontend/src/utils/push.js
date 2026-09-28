import { pushApi } from './api';

export function supportsPush() {
    return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function urlBase64ToUint8Array(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function pushRegistration() {
    // vite dev intentionally has no worker. Avoid an endlessly pending ready promise.
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration) throw new Error('앱 준비가 끝나지 않았습니다. 새로고침 후 다시 시도해 주세요. 로컬에서는 빌드 미리보기를 사용해 주세요.');
    let timer;
    try {
        return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('앱 준비 시간이 초과되었습니다. 새로고침해 주세요.')), 10000); }),
        ]);
    } finally { clearTimeout(timer); }
}

export async function disablePush() {
    if (!supportsPush()) return;
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    // Stop local delivery even if the network request fails. The server will prune 410s.
    try { await pushApi.unsubscribe(subscription.endpoint); }
    finally {
        await subscription.unsubscribe();
        const notifications = await registration.getNotifications();
        notifications.forEach(notification => notification.close());
    }
}
