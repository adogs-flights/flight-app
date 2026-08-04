import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { activityApi } from '../utils/api';

// 서버 응답 키 → 해당 항목을 '확인'하게 되는 메뉴 경로.
// 그 경로로 이동하면 마지막 확인 시각이 갱신되어 뱃지가 사라진다.
const ROUTE_BY_KEY = {
    submissions: '/submissions',
    my_application_updates: '/myapplications',
    owned_new_applications: '/mytickets',
    pending_orgs: '/admin',
};
const KEYS = Object.keys(ROUTE_BY_KEY);
const STORAGE_KEY = 'sidebarLastSeen_v1';
const POLL_MS = 60000;

function loadSeen() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveSeen(seen) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
    } catch {
        /* 저장 실패는 무시 (뱃지는 부가 기능) */
    }
}

// 각 메뉴에 '마지막으로 본 이후' 새로 생긴 항목 수를 반환한다.
// 새 내역 판단은 전적으로 클라이언트의 마지막 확인 시각(localStorage) 기준.
export function useSidebarActivity() {
    const [activity, setActivity] = useState({}); // key -> [epoch ms]
    const [seen, setSeen] = useState(loadSeen);
    const location = useLocation();

    const fetchActivity = useCallback(async () => {
        try {
            const res = await activityApi.getSidebar();
            const parsed = {};
            for (const key of KEYS) {
                parsed[key] = (res.data[key] || [])
                    .map((t) => new Date(t).getTime())
                    .filter((n) => !Number.isNaN(n));
            }
            setActivity(parsed);
        } catch {
            /* 조용히 무시 */
        }
    }, []);

    // 최초 1회 + 주기 폴링 + 탭 복귀 시 갱신
    useEffect(() => {
        fetchActivity();
        const id = setInterval(fetchActivity, POLL_MS);
        const onFocus = () => fetchActivity();
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(id);
            window.removeEventListener('focus', onFocus);
        };
    }, [fetchActivity]);

    // 해당 메뉴로 이동하면 그 항목을 '확인함'으로 처리한다.
    useEffect(() => {
        const key = KEYS.find((k) => ROUTE_BY_KEY[k] === location.pathname);
        if (!key) return;
        setSeen((prev) => {
            const next = { ...prev, [key]: Date.now() };
            saveSeen(next);
            return next;
        });
    }, [location.pathname]);

    const counts = {};
    for (const key of KEYS) {
        const since = seen[key] || 0;
        counts[key] = (activity[key] || []).filter((ts) => ts > since).length;
    }
    return counts;
}
