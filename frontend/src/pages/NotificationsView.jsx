import { ActionLink, Button, Heading } from '../components/ui/primitives.js';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pushApi } from '../utils/api';
import { disablePush, pushRegistration, supportsPush, urlBase64ToUint8Array } from '../utils/push';

export default function NotificationsView() {
    const supported = supportsPush();
    const [state, setState] = useState({ loading: true, enabled: false, local: false, subscribed: false, permission: 'default' });
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const refresh = useCallback(async () => {
        const { data } = await pushApi.status();
        const registration = supported ? await navigator.serviceWorker.getRegistration('/') : null;
        const subscription = await registration?.pushManager.getSubscription();
        const subscribed = subscription ? (await pushApi.subscriptionStatus(subscription.endpoint)).data.subscribed : false;
        setState({ loading: false, enabled: data.enabled, local: Boolean(subscription), subscribed,
            permission: 'Notification' in window ? Notification.permission : 'default' });
    }, [supported]);

    useEffect(() => {
        const reload = () => refresh().catch(() => {
            setState(previous => ({ ...previous, loading: false }));
            setNotice('알림 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.');
        });
        reload();
        window.addEventListener('focus', reload);
        return () => window.removeEventListener('focus', reload);
    }, [refresh]);

    const run = async action => {
        setBusy(true); setNotice('');
        try { await action(); }
        catch (error) { setNotice(error.response ? '요청을 처리하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.' : error.message); }
        finally {
            try { await refresh(); } catch { setNotice('알림 상태를 다시 확인하지 못했습니다. 새로고침해 주세요.'); }
            setBusy(false);
        }
    };

    const enable = () => run(async () => {
        // Keep permission prompt directly within the user's click, before any await.
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('알림 권한이 허용되지 않았습니다. 브라우저 설정을 확인해 주세요.');
        const registration = await pushRegistration();
        const { data } = await pushApi.publicKey();
        const applicationServerKey = urlBase64ToUint8Array(data.public_key);
        let subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            const oldKey = new Uint8Array(subscription.options.applicationServerKey || []);
            if (oldKey.length !== applicationServerKey.length || oldKey.some((value, index) => value !== applicationServerKey[index])) {
                await pushApi.unsubscribe(subscription.endpoint);
                await subscription.unsubscribe();
                subscription = null;
            }
        }
        const created = !subscription;
        subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        try { await pushApi.subscribe(subscription.toJSON()); }
        catch (error) { if (created) await subscription.unsubscribe(); throw error; }
        setNotice('이 브라우저에서 알림을 받습니다.');
    });

    const disabled = busy || state.loading;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const permissionLabel = { default: '아직 요청하지 않음', granted: '허용', denied: '차단' };
    return (
        <main className="max-w-2xl mx-auto p-6 space-y-6">
            <ActionLink as={Link} to="/" variant="notifications">해봉티켓으로 돌아가기</ActionLink>
            <Heading as="h1" variant="notifications">알림 설정</Heading>
            <p className="text-muted-foreground">티켓 나눔 신청 결과와 내 티켓의 새 신청을 알려드립니다. 설정은 기기별로 적용됩니다.</p>
            <dl className="bg-card border rounded-2xl p-5 space-y-3">
                <div>알림 지원: {supported ? '지원됨' : '현재 환경에서 지원되지 않음'}</div>
                <div>권한 상태: {permissionLabel[state.permission]}</div>
                <div>현재 브라우저 구독: {state.loading ? '확인 중' : state.subscribed ? '현재 계정에 등록됨' : state.local ? '브라우저 구독 있음 · 현재 계정에 등록 필요' : '미등록'}</div>
                <div>서버 알림: {state.loading ? '확인 중' : state.enabled ? '사용 가능' : '설정되지 않음'}</div>
            </dl>
            {state.permission === 'denied' && <p>알림이 차단되어 있습니다. 브라우저 또는 기기 설정에서 이 사이트의 알림을 허용한 뒤 다시 시도해 주세요.</p>}
            {!standalone && <p className="text-sm text-muted-foreground">iPhone·iPad에서는 지원되는 OS에서 공유 메뉴의 ‘홈 화면에 추가’로 설치한 뒤, 홈 화면의 해봉티켓을 열어 알림을 켜 주세요.</p>}
            {!window.isSecureContext && <p>알림을 사용하려면 HTTPS 연결이 필요합니다.</p>}
            <div className="flex flex-wrap gap-3">
                <Button variant="notificationPrimary" onClick={enable} disabled={disabled || !supported || !state.enabled || state.permission === 'denied' || state.subscribed}>알림 받기</Button>
                <Button variant="notificationSecondary" disabled={disabled || !state.local} onClick={() => run(async () => { await disablePush(); setNotice('이 브라우저의 알림을 껐습니다.'); })}>알림 끄기</Button>
                <Button variant="notificationSecondary" disabled={disabled || !state.enabled || !state.subscribed || state.permission !== 'granted'} onClick={() => run(async () => { await pushApi.test(); setNotice('발송을 요청했습니다. 실제 도착 여부는 기기에서 확인해 주세요.'); })}>테스트 알림 보내기</Button>
            </div>
            <p role="status" aria-live="polite">{notice}</p>
        </main>
    );
}
