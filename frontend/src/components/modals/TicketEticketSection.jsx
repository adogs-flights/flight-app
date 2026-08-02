import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

// 봉사자가 제출한 e티켓 이미지를, 그 제출로 만든 티켓(일정) 상세에서 보여준다.
// 파일은 소유자/관리자만 서빙되므로 이 섹션도 그 권한 안에서만 렌더한다.
export default function TicketEticketSection({ ticket }) {
    const { apiClient } = useAuth();
    const [url, setUrl] = useState('');
    const [isPdf, setIsPdf] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!ticket.has_eticket) return;
        let objectUrl;
        apiClient.get(`/tickets/${ticket.id}/eticket`, { responseType: 'blob' })
            .then(res => {
                objectUrl = URL.createObjectURL(res.data);
                setIsPdf(res.data.type === 'application/pdf');
                setUrl(objectUrl);
            })
            .catch(() => setFailed(true));
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [ticket.id, ticket.has_eticket, apiClient]);

    if (!ticket.has_eticket) return null;

    return (
        <div className="mt-4 pt-4 border-t-2 border-border/50 px-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">e티켓</label>
            {failed ? (
                <p className="mt-2 text-xs text-muted-foreground">e티켓을 불러오지 못했습니다.</p>
            ) : !url ? (
                <p className="mt-2 text-xs text-muted-foreground">불러오는 중…</p>
            ) : isPdf ? (
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                    📄 e티켓 (PDF) 보기
                </a>
            ) : (
                <a href={url} target="_blank" rel="noreferrer" className="mt-2 block">
                    <img
                        src={url}
                        alt="e티켓"
                        className="max-h-72 w-auto rounded-lg border border-border shadow-sm"
                    />
                </a>
            )}
        </div>
    );
}
