import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { safeNotificationUrl } from '../src/utils/notificationUrl.js';

const origin = 'https://app.example';

test('notification targets allow only safe application paths', () => {
    for (const path of ['/myapplications', '/mytickets', '/notifications']) {
        assert.equal(safeNotificationUrl(path, origin), origin + path);
    }
    for (const path of ['//evil.test', '/\\evil.test', 'https://evil.test', 'javascript:alert(1)', '/api/redirect', '/%2f%2fevil.test', null]) {
        assert.equal(safeNotificationUrl(path, origin), origin + '/notifications');
    }
    assert.equal(safeNotificationUrl('/mytickets?redirect=https://evil.test', origin), origin + '/mytickets');
});

async function worker() {
    const listeners = {};
    const shown = [];
    const opened = [];
    const self = {
        location: { origin },
        __WB_MANIFEST: [],
        registration: { showNotification: async (title, options) => shown.push({ title, ...options }) },
        clients: { matchAll: async () => [], openWindow: async url => opened.push(url) },
        addEventListener: (event, listener) => { listeners[event] = listener; },
    };
    const source = (await readFile(new URL('../src/sw.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
    vm.runInNewContext(source, { self, URL, safeNotificationUrl, precacheAndRoute() {}, cleanupOutdatedCaches() {} });
    return { listeners, shown, opened, self };
}

test('push -> click preserves destination and opens a new app window', async () => {
    const { listeners, shown, opened } = await worker();
    let pending;
    const waitUntil = promise => { pending = promise; };
    listeners.push({ data: { json: () => ({ title: '신청 결과', body: '승인', url: '/myapplications' }) }, waitUntil });
    await pending;
    let closed = false;
    listeners.notificationclick({ notification: { ...shown[0], close: () => { closed = true; } }, waitUntil });
    await pending;
    assert.equal(closed, true);
    assert.deepEqual(opened, [origin + '/myapplications']);
});

test('click reuses and focuses an existing app window', async () => {
    const { listeners, opened, self } = await worker();
    const actions = [];
    self.clients.matchAll = async () => [{ url: origin + '/', navigate: async url => {
        actions.push(url);
        return { focus: async () => actions.push('focus') };
    } }];
    let pending;
    listeners.notificationclick({ notification: { data: { url: '/mytickets' }, close() {} }, waitUntil: promise => { pending = promise; } });
    await pending;
    assert.deepEqual(actions, [origin + '/mytickets', 'focus']);
    assert.deepEqual(opened, []);
});

test('malformed push still produces a visible notification', async () => {
    const { listeners, shown } = await worker();
    let pending;
    listeners.push({ data: { json() { throw new SyntaxError(); } }, waitUntil: promise => { pending = promise; } });
    await pending;
    assert.equal(shown[0].title, '해봉티켓');
    assert.equal(shown[0].data.url, '/notifications');
});
