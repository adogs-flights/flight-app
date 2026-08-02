import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

const inputClass = "flex h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm transition-all focus:border-primary/50 focus-visible:outline-none";
const fileClass = "flex w-full rounded-lg border-2 border-border bg-background px-3 py-1.5 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-bold file:bg-primary file:text-primary-foreground";

// 티켓의 출국 준비 추가정보(주소·여권·자리확약). 소유자/관리자가 티켓 화면에서 직접 입력.
export default function TicketDepartureSection({ ticket, canManage, onDone }) {
    const { apiClient } = useAuth();
    const [address, setAddress] = useState('');
    const [passport, setPassport] = useState(null);
    const [seatConfirm, setSeatConfirm] = useState(null);
    const [passportUrl, setPassportUrl] = useState('');
    const [seatUrl, setSeatUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let revoked = [];
        if (ticket.has_passport) {
            apiClient.get(`/tickets/${ticket.id}/passport`, { responseType: 'blob' })
                .then(res => { const u = URL.createObjectURL(res.data); revoked.push(u); setPassportUrl(u); })
                .catch(() => setPassportUrl(''));
        }
        if (ticket.has_seat_confirm) {
            apiClient.get(`/tickets/${ticket.id}/seat-confirm`, { responseType: 'blob' })
                .then(res => { const u = URL.createObjectURL(res.data); revoked.push(u); setSeatUrl(u); })
                .catch(() => setSeatUrl(''));
        }
        return () => revoked.forEach(u => URL.revokeObjectURL(u));
    }, [ticket.id, ticket.has_passport, ticket.has_seat_confirm, apiClient]);

    const submit = async () => {
        setError('');
        if (!address.trim()) { setError('주소를 입력해주세요.'); return; }
        if (!passport || !seatConfirm) { setError('여권 사본과 자리 확약 캡쳐를 모두 첨부해주세요.'); return; }
        const fd = new FormData();
        fd.append('dep_address', address);
        fd.append('passport', passport);
        fd.append('seat_confirm', seatConfirm);
        setSubmitting(true);
        try {
            const res = await apiClient.post(`/tickets/${ticket.id}/departure-info`, fd);
            onDone?.(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || '저장에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async () => {
        if (!window.confirm('제출된 개인정보(e티켓·여권 사본·자리 확약 등)를 영구 삭제하시겠습니까?')) return;
        try {
            const res = await apiClient.delete(`/tickets/${ticket.id}/departure-info`);
            onDone?.(res.data);
        } catch {
            setError('삭제에 실패했습니다.');
        }
    };

    // 삭제(파기)는 e티켓까지 함께 지운다. 지울 게 하나도 없을 때만 '삭제됨'으로 본다.
    const purged = ticket.departure_submitted && !ticket.has_passport && !ticket.has_seat_confirm && !ticket.dep_address && !ticket.has_eticket;
    // e티켓만 있고 출국 정보는 아직 없는 티켓(승인 직후)에서도 파기할 수 있어야 한다.
    const canPurge = canManage && !purged && (ticket.departure_submitted || ticket.has_eticket);

    return (
        <div className="mt-4 pt-4 border-t-2 border-border/50 px-1">
            <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">출국 준비 추가정보</label>

            {ticket.departure_submitted ? (
                purged ? (
                    <p className="mt-2 text-xs font-bold text-muted-foreground">🗑️ 출국 준비 개인정보가 삭제되었습니다.</p>
                ) : (
                    <div className="mt-2 space-y-2">
                        {ticket.dep_address && <div className="text-sm"><span className="font-bold">주소:</span> {ticket.dep_address}</div>}
                        <div className="flex flex-wrap gap-3">
                            {passportUrl && <a href={passportUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">📄 여권 사본</a>}
                            {seatUrl && <a href={seatUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline">🎫 자리 확약 캡쳐</a>}
                        </div>
                    </div>
                )
            ) : canManage ? (
                <div className="mt-2 space-y-2">
                    <input className={inputClass} value={address} onChange={e => setAddress(e.target.value)} placeholder="출국 준비 서류에 기재될 주소" />
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">여권 사본</span>
                        <input className={fileClass} type="file" accept="image/*,application/pdf" onChange={e => setPassport(e.target.files?.[0] || null)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">자리 확약 캡쳐</span>
                        <input className={fileClass} type="file" accept="image/*,application/pdf" onChange={e => setSeatConfirm(e.target.files?.[0] || null)} />
                    </div>
                    {error && <div className="px-3 py-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">{error}</div>}
                    <button onClick={submit} disabled={submitting} className="w-full h-10 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                        {submitting ? '저장 중…' : '추가정보 저장'}
                    </button>
                </div>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground">아직 입력되지 않았습니다.</p>
            )}

            {canPurge && (
                <button onClick={remove} className="mt-3 block text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4">
                    제출 개인정보 삭제 (e티켓·여권 등)
                </button>
            )}
        </div>
    );
}
