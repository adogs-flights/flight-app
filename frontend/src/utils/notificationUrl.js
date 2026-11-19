export function safeNotificationUrl(value, origin) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return `${origin}/notifications`;
    try {
        const url = new URL(value, origin);
        // Notifications point to application screens, never redirect/API endpoints.
        if (url.origin !== origin || !['/notifications', '/myapplications', '/mytickets'].includes(url.pathname)) return `${origin}/notifications`;
        return `${origin}${url.pathname}`;
    } catch {
        return `${origin}/notifications`;
    }
}
