import React from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

export default function TicketDetailModal({ isOpen, onClose, ticket, onEditClick, onApplyClick, onViewApplicantsClick }) {
    const { user } = useAuth();
    if (!ticket) return null;

    const isOwner = ticket.owner_id === user.id;
    const canEdit = ticket.created_by_id === user.id;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const statusLabel = {
        'regular': '📅 일반 일정',
        'sharing': '🟢 나눔중',
        'shared': '✅ 나눔 완료',
        'owned': '🔒 소유중'
    }[ticket.status] || ticket.status;

    const airportLabel = ticket.country; // Assuming country field stores airport label like "JFK" or "🗽 JFK"

    const pendingCount = ticket.applications?.filter(a => a.status === 'pending').length || 0;

    const footer = (
        <>
            <button className="btn btn-ghost" onClick={onClose}>닫기</button>
            {canEdit && (
                <button className="btn btn-outline" onClick={() => { onClose(); onEditClick(ticket); }}>수정</button>
            )}
            {isOwner && ticket.status === 'sharing' && (
                <button className="btn btn-primary" onClick={() => { onClose(); onViewApplicantsClick(ticket); }}>📋 신청자 {ticket.applications?.length || 0}건</button>
            )}
            {!isOwner && ticket.status === 'sharing' && (
                <button className="btn btn-green" onClick={() => { onClose(); onApplyClick(ticket); }}>🎁 나눔 신청</button>
            )}
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={ticket.title} footer={footer}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                    <div className="detail-label">상태</div>
                    <div className="detail-value">{statusLabel}</div>
                </div>
                <div>
                    <div className="detail-label">공항</div>
                    <div className="detail-value">{airportLabel}</div>
                </div>
                <div>
                    <div className="detail-label">출발</div>
                    <div className="detail-value">{formatDate(ticket.departure_date)}</div>
                </div>
                <div>
                    <div className="detail-label">귀국</div>
                    <div className="detail-value">{formatDate(ticket.return_date)}</div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                    <div className="detail-label">항공편</div>
                    <div className="detail-value">{ticket.flight_info}</div>
                </div>
                <div>
                    <div className="detail-label">등록자</div>
                    <div className="detail-value">{ticket.creator?.name || '알 수 없음'}</div>
                </div>
                <div>
                    <div className="detail-label">현 소유자</div>
                    <div className="detail-value">{ticket.owner?.name || '알 수 없음'}</div>
                </div>
                {ticket.memo && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div className="detail-label">메모</div>
                        <div className="detail-value" style={{ background: 'var(--paper-warm)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.7' }}>
                            {ticket.memo}
                        </div>
                    </div>
                )}
                {isOwner && pendingCount > 0 && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div className="info-box yellow" style={{ margin: 0 }}>
                            🔔 새 나눔 신청 <strong>{pendingCount}건</strong>이 들어왔습니다.
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
