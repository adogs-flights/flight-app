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
        <div className="flex items-center justify-end w-full gap-2">
            {canDelete && (
                <button 
                    className="px-4 py-2 text-xs font-bold rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors mr-auto" 
                    onClick={handleDelete}
                >
                    삭제
                </button>
            )}
            <button 
                className="px-4 py-2 text-xs font-bold rounded-md bg-secondary text-secondary-foreground border border-border hover:bg-muted transition-colors" 
                onClick={onClose}
            >
                닫기
            </button>
            {canEdit && (
                <button 
                    className="px-4 py-2 text-xs font-bold rounded-md bg-background text-foreground border-2 border-border hover:border-primary/50 transition-colors" 
                    onClick={() => { onClose(); onEditClick(ticket); }}
                >
                    수정
                </button>
            )}
            {isOwner && ticket.status === 'sharing' && (
                <button 
                    className="px-4 py-2 text-xs font-bold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm" 
                    onClick={() => { onClose(); onViewApplicantsClick(ticket); }}
                >
                    신청자 목록
                </button>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={ticket.title} footer={footer}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">상태</label>
                        <div className="text-sm font-semibold text-foreground">{statusLabel}</div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">도착 공항</label>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const colors = getAirportColor(ticket.arrival_airport, rawAirports);
                                return (
                                    <span 
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border" 
                                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                                    >
                                        {ticket.arrival_airport}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">출발일</label>
                        <div className="text-sm font-semibold text-foreground">
                            {formatDate(ticket.departure_date)}
                            {ticket.departure_time && <span className="ml-2 text-xs font-medium text-muted-foreground">({ticket.departure_time})</span>}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">귀국일</label>
                        <div className="text-sm font-semibold text-foreground">
                            {formatDate(ticket.return_date)}
                            {ticket.arrival_time && <span className="ml-2 text-xs font-medium text-muted-foreground">({ticket.arrival_time})</span>}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border-2 border-border/50">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">항공사</label>
                        <div className="text-xs font-semibold text-foreground">{ticket.airline || '-'}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">항공편</label>
                        <div className="text-xs font-semibold text-foreground">{ticket.flight_info || '-'}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">기내 여유</label>
                        <div className="text-xs font-semibold text-foreground">{Number(ticket.cabin_capacity || 0)} 석</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">수하물 여유</label>
                        <div className="text-xs font-semibold text-foreground">{Number(ticket.cargo_capacity || 0)} 석</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">소유자</label>
                        <div className="text-sm font-semibold text-foreground">{ticket.owner?.name || ticket.manager_name || '-'}</div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">연락처</label>
                        <div className="text-sm font-semibold text-foreground truncate">{ticket.owner?.email || ticket.contact || '-'}</div>
                    </div>
                </div>

                {ticket.memo && (
                    <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">메모</label>
                        <div className="text-sm leading-relaxed text-muted-foreground bg-accent/30 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">
                            {ticket.memo}
                        </div>
                    </div>
                )}

                {isOwner && pendingCount > 0 && (
                    <div className="animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-earth bg-earth-foreground border border-earth/20 rounded-xl">
                            <span className="text-lg">💡</span>
                            이 티켓에 {pendingCount}건의 신청이 대기 중입니다.
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
