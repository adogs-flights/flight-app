import React from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';

export default function TicketDetailModal({ isOpen, onClose, ticket, onEditClick, onViewApplicantsClick, onDeleteClick }) {
    const { user, rawAirports } = useAuth();
    if (!ticket) return null;

    const isAdmin = user.admin_info && user.admin_info.approved;
    const isOwner = ticket.owner_id === user.id;
    const canEdit = ticket.created_by_id === user.id || isAdmin;
    const canDelete = isOwner || isAdmin;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const statusLabel = {
        'regular': '정규',
        'sharing': '나눔중',
        'shared': '나눔 완료',
        'owned': '개인 소장중'
    }[ticket.status] || ticket.status;

    const pendingCount = ticket.applications?.filter(a => a.status === 'pending').length || 0;

    const handleDelete = () => {
        onClose();
        onDeleteClick(ticket.id);
    };

    const footer = (
        <>
            {/* <button className="btn btn-ghost" onClick={onClose}>닫기</button> */}
            {canDelete && (
                <button className="btn btn-del" onClick={handleDelete}>삭제</button>
            )}
            {canEdit && (
                <button className="btn btn-outline" onClick={() => { onClose(); onEditClick(ticket); }}>수정</button>
            )}
            {isOwner && ticket.status === 'sharing' && (
                <button className="btn btn-primary" onClick={() => { onClose(); onViewApplicantsClick(ticket); }}>신청자 목록</button>
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
                    <div className="detail-label">도착 공항</div>
                    <div className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                            const colors = getAirportColor(ticket.arrival_airport, rawAirports);
                            return (
                                <span 
                                    className="badge badge-airport" 
                                    style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg, padding: '2px 8px', fontSize: '11px' }}
                                >
                                    {ticket.arrival_airport}
                                </span>
                            );
                        })()}
                    </div>
                </div>
                <div>
                    <div className="detail-label">출발일</div>
                    <div className="detail-value">
                        {formatDate(ticket.departure_date)}
                        {ticket.departure_time && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--ink-mute)' }}>({ticket.departure_time})</span>}
                    </div>
                </div>
                <div>
                    <div className="detail-label">귀국일</div>
                    <div className="detail-value">
                        {formatDate(ticket.return_date)}
                        {ticket.arrival_time && <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--ink-mute)' }}>({ticket.arrival_time})</span>}
                    </div>
                </div>

                <div style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '12px', background: 'var(--paper-warm)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                        <div className="detail-label" style={{ marginBottom: '2px' }}>항공사</div>
                        <div className="detail-value" style={{ fontSize: '13px' }}>{ticket.airline || '-'}</div>
                    </div>
                    <div>
                        <div className="detail-label" style={{ marginBottom: '2px' }}>항공편</div>
                        <div className="detail-value" style={{ fontSize: '13px' }}>{ticket.flight_info || '-'}</div>
                    </div>
                    <div>
                        <div className="detail-label" style={{ marginBottom: '2px' }}>기내 여유</div>
                        <div className="detail-value" style={{ fontSize: '13px' }}>{Number(ticket.cabin_capacity || 0)} 석</div>
                    </div>
                    <div>
                        <div className="detail-label" style={{ marginBottom: '2px' }}>수하물 여유</div>
                        <div className="detail-value" style={{ fontSize: '13px' }}>{Number(ticket.cargo_capacity || 0)} 석</div>
                    </div>
                </div>

                <div style={{ gridColumn: '1/2' }}>
                    <div className="detail-label">소유자</div>
                    <div className="detail-value">{ticket.owner?.name || ticket.manager_name || '-'}</div>
                </div>
                <div style={{ gridColumn: '2/3' }}>
                    <div className="detail-label">연락처</div>
                    <div className="detail-value">{ticket.owner?.email || ticket.contact || '-'}</div>
                </div>

                {ticket.memo && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div className="detail-label">메모</div>
                        <div className="detail-value" style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>
                            {ticket.memo}
                        </div>
                    </div>
                )}
                {isOwner && pendingCount > 0 && (
                    <div style={{ gridColumn: '1/-1' }}>
                        <div className="info-box yellow" style={{ margin: 0 }}>
                            이 티켓에 <strong>{pendingCount}건</strong>의 신청이 대기 중입니다.
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
