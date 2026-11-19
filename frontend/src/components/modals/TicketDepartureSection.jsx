import { ActionLink, Alert, Button, FieldLabel, Input } from '../ui/primitives.js';
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';




// 티켓의 출국 준비 추가정보(주소·여권·자리확약). 소유자/관리자가 티켓 화면에서 직접 입력.
export default function TicketDepartureSection({ ticket, canManage, onDone }) {
    const { apiClient } = useAuth();
    const [address, setAddress] = useState('');
    const [kakaoId, setKakaoId] = useState('');
    const [passport, setPassport] = useState(null);
    const [seatConfirm, setSeatConfirm] = useState(null);
    const [eticket, setEticket] = useState(null);
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
        if (!kakaoId.trim()) { setError('카카오톡 아이디를 입력해주세요.'); return; }
        if (!passport || !seatConfirm) { setError('여권 사본과 자리 확약 캡쳐를 모두 첨부해주세요.'); return; }
        if (!eticket && !ticket.has_eticket) { setError('e티켓 사진을 첨부해주세요.'); return; }
        const fd = new FormData();
        fd.append('dep_address', address);
        fd.append('dep_kakao_id', kakaoId);
        fd.append('passport', passport);
        fd.append('seat_confirm', seatConfirm);
        if (eticket) fd.append('eticket', eticket);
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
    const purged = ticket.departure_submitted && !ticket.has_passport && !ticket.has_seat_confirm && !ticket.dep_address && !ticket.dep_kakao_id && !ticket.has_eticket;
    // e티켓만 있고 출국 정보는 아직 없는 티켓(승인 직후)에서도 파기할 수 있어야 한다.
    const canPurge = canManage && !purged && (ticket.departure_submitted || ticket.has_eticket);

    return (
        <div className="mt-4 pt-4 border-t-2 border-border/50 px-1">
            <FieldLabel variant="ticketDeparture">출국 준비 추가정보</FieldLabel>

            {ticket.departure_submitted ? (
                purged ? (
                    <p className="mt-2 text-xs font-bold text-muted-foreground">🗑️ 출국 준비 개인정보가 삭제되었습니다.</p>
                ) : (
                    <div className="mt-2 space-y-2">
                        {ticket.dep_address && <div className="text-sm"><span className="font-bold">주소:</span> {ticket.dep_address}</div>}
                        {ticket.dep_kakao_id && <div className="text-sm"><span className="font-bold">카카오톡 아이디:</span> {ticket.dep_kakao_id}</div>}
                        <div className="flex flex-wrap gap-3">
                            {passportUrl && <ActionLink href={passportUrl} target="_blank" rel="noreferrer" variant="signupChoice2">📄 여권 사본</ActionLink>}
                            {seatUrl && <ActionLink href={seatUrl} target="_blank" rel="noreferrer" variant="signupChoice2">🎫 자리 확약 캡쳐</ActionLink>}
                        </div>
                    </div>
                )
            ) : canManage ? (
                <div className="mt-2 space-y-2">
                    <Input variant="compact" value={address} onChange={e => setAddress(e.target.value)} placeholder="출국 준비 서류에 기재될 주소" />
                    <Input variant="compact" value={kakaoId} onChange={e => setKakaoId(e.target.value)} placeholder="카카오톡 아이디" />
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">여권 사본</span>
                        <Input variant="compactFile" type="file" accept="image/*,application/pdf" onChange={e => setPassport(e.target.files?.[0] || null)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">자리 확약 캡쳐</span>
                        <Input variant="compactFile" type="file" accept="image/*,application/pdf" onChange={e => setSeatConfirm(e.target.files?.[0] || null)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-muted-foreground">e티켓 사진{ticket.has_eticket && ' (이미 등록됨 · 교체 시에만 첨부)'}</span>
                        <Input variant="compactFile" type="file" accept="image/*,application/pdf" onChange={e => setEticket(e.target.files?.[0] || null)} />
                    </div>
                    {error && <Alert variant="generalSignup">{error}</Alert>}
                    <Button onClick={submit} disabled={submitting} variant="saveDeparture">
                        {submitting ? '저장 중…' : '추가정보 저장'}
                    </Button>
                </div>
            ) : (
                <p className="mt-2 text-xs text-muted-foreground">아직 입력되지 않았습니다.</p>
            )}

            {canPurge && (
                <Button onClick={remove} variant="purgeDocuments">
                    제출 개인정보 삭제 (e티켓·여권 등)
                </Button>
            )}
        </div>
    );
}
