import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const POLL_INTERVAL_MS = 45000;

function timeAgo(iso) {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Math.max(0, Date.now() - then);
    const min = Math.floor(diff / 60000);
    if (min < 1) return '방금';
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}일 전`;
    return new Date(iso).toLocaleDateString();
}

function BellIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

export default function NotificationBell() {
    const { apiClient } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await apiClient.get('/notifications/unread-count');
            setUnread(res.data.count);
        } catch {
            // 조용히 무시 (로그아웃 상태 등)
        }
    }, [apiClient]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/notifications', { params: { limit: 20 } });
            setItems(res.data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [apiClient]);

    // 미읽음 개수 폴링
    useEffect(() => {
        fetchUnread();
        const id = setInterval(fetchUnread, POLL_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchUnread]);

    // 바깥 클릭 시 닫기
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) fetchList();
    };

    const handleItemClick = async (item) => {
        setOpen(false);
        if (!item.is_read) {
            setUnread((c) => Math.max(0, c - 1));
            setItems((list) => list.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
            try { await apiClient.post(`/notifications/${item.id}/read`); } catch { /* noop */ }
        }
        if (item.link) navigate(item.link);
    };

    const handleReadAll = async () => {
        if (unread === 0) return;
        setUnread(0);
        setItems((list) => list.map((n) => ({ ...n, is_read: true })));
        try { await apiClient.post('/notifications/read-all'); } catch { /* noop */ }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={toggle}
                aria-label="알림"
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <BellIcon />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-black leading-none ring-2 ring-background">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border-2 border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="text-sm font-bold text-foreground">알림</span>
                        <button
                            type="button"
                            onClick={handleReadAll}
                            disabled={unread === 0}
                            className="text-[11px] font-bold text-primary hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                        >
                            모두 읽음
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="py-10 text-center text-xs text-muted-foreground">불러오는 중…</div>
                        ) : items.length === 0 ? (
                            <div className="py-10 text-center text-xs text-muted-foreground">
                                <div className="text-2xl mb-1">🔔</div>
                                새 알림이 없습니다.
                            </div>
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {items.map((n) => (
                                    <li key={n.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(n)}
                                            className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${n.is_read ? '' : 'bg-primary/5'}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {!n.is_read && <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-primary" />}
                                                <div className={`flex-1 min-w-0 ${n.is_read ? 'pl-4' : ''}`}>
                                                    <p className="text-sm font-bold text-foreground">{n.title}</p>
                                                    {n.body && <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{n.body}</p>}
                                                    <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at)}</p>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
