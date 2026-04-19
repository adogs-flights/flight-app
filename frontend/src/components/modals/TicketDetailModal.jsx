import React, { useRef, useState } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';
import { toBlob } from 'html-to-image';
import apiClient from '../../utils/api';

export default function TicketDetailModal({ isOpen, onClose, ticket, onEditClick, onDeleteClick, onUpdate }) {
    const { user, rawAirports } = useAuth();
    const [isSharingImage, setIsSharingImage] = useState(false);
    const contentRef = useRef(null);

    if (!ticket) return null;

    const isAdmin = user.admin_info && user.admin_info.approved;
    const isOwner = ticket.owner_id === user.id;
    const canEdit = ticket.created_by_id === user.id || isAdmin;
    const canDelete = isOwner || isAdmin;

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        } catch {
            return '-';
        }
    };

    const statusLabel = {
        'regular': '정규',
        'sharing': '나눔중',
        'shared': '나눔 완료',
        'owned': '개인 소장중'
    }[ticket.status] || ticket.status;

    const handleDelete = () => {
        onClose();
        onDeleteClick(ticket.id);
    };

    const handleToggleStatus = async () => {
        const isCurrentlySharing = ticket.status === 'sharing';
        const newStatus = isCurrentlySharing ? 'owned' : 'sharing';
        const confirmMessage = isCurrentlySharing ? '나눔을 취소하시겠습니까?' : '나눔하시겠습니까?';
        const successMessage = isCurrentlySharing ? '나눔이 취소되었습니다.' : '나눔이 완료되었습니다.';

        if (window.confirm(confirmMessage)) {
            try {
                const response = await apiClient.put(`/tickets/${ticket.id}`, { status: newStatus });
                alert(successMessage);
                onClose(); // 모달 즉시 닫기
                if (onUpdate) {
                    onUpdate(response.data);
                }
            } catch {
                alert('상태 변경에 실패했습니다.');
            }
        }
    };

    const handleShareImage = async () => {
        if (!contentRef.current || isSharingImage) return;

        if (!navigator.share) {
            alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
            return;
        }

        setIsSharingImage(true);
        try {
            const originalPadding = contentRef.current.style.padding;
            const originalWidth = contentRef.current.style.width;
            const originalMinWidth = contentRef.current.style.minWidth;

            // 캡처 시 레이아웃 고정을 위해 너비와 패딩 강제 설정
            contentRef.current.style.padding = '20px 2px';
            contentRef.current.style.width = '400px';
            contentRef.current.style.minWidth = '400px';
            
            // 이미지 캡처용 제목 임시 노출 및 이메일 말줄임 해제
            const shareTitle = contentRef.current.querySelector('.share-title-only');
            if (shareTitle) shareTitle.style.display = 'block';
            
            const emailElem = contentRef.current.querySelector('.share-email-target');
            let originalEmailOverflow = '';
            let originalEmailWhiteSpace = '';
            if (emailElem) {
                originalEmailOverflow = emailElem.style.overflow;
                originalEmailWhiteSpace = emailElem.style.whiteSpace;
                emailElem.style.overflow = 'visible';
                emailElem.style.whiteSpace = 'normal';
                emailElem.style.wordBreak = 'break-all';
            }
            
            const blob = await toBlob(contentRef.current, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: false,
                width: 400, // 고정 너비 명시
                height: contentRef.current.offsetHeight,
                fontEmbedCSS: `
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-Regular.woff2') format('woff2');
                        font-weight: 400;
                    }
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-SemiBold.woff2') format('woff2');
                        font-weight: 600;
                    }
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-Bold.woff2') format('woff2');
                        font-weight: 700;
                    }
                    @font-face {
                        font-family: 'Pretendard';
                        src: url('/fonts/Pretendard-Black.woff2') format('woff2');
                        font-weight: 900;
                    }
                    @font-face {
                        font-family: 'Gowun Batang';
                        src: url('/fonts/GowunBatang-Regular.woff2') format('woff2');
                        font-weight: 400;
                    }
                    @font-face {
                        font-family: 'Gowun Batang';
                        src: url('/fonts/GowunBatang-Bold.woff2') format('woff2');
                        font-weight: 700;
                    }
                `,
            });

            // 원상 복구
            if (shareTitle) shareTitle.style.display = 'none';
            if (emailElem) {
                emailElem.style.overflow = originalEmailOverflow;
                emailElem.style.whiteSpace = originalEmailWhiteSpace;
            }
            contentRef.current.style.padding = originalPadding;
            contentRef.current.style.width = originalWidth;
            contentRef.current.style.minWidth = originalMinWidth;

            if (!blob) throw new Error('이미지 생성에 실패했습니다.');

            const fileName = `ticket-${ticket.arrival_airport || 'info'}.png`.replace(/\s+/g, '-');
            const file = new File([blob], fileName, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                });
            } else {
                await navigator.share({
                    url: window.location.href
                });
            }
        } catch (err) {
            console.error('Image Share Error:', err);
            if (err.name !== 'AbortError') {
                alert(`공유 실패: ${err.message || '알 수 없는 오류가 발생했습니다.'}`);
            }
        } finally {
            setIsSharingImage(false);
        }
    };

    const footer = (
        <div className="flex flex-col w-full gap-5 border-t border-slate-100">
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                    <button 
                        className="flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96] shadow-sm" 
                        onClick={handleShareImage}
                        disabled={isSharingImage}
                    >
                        {isSharingImage ? (
                            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
                        ) : (
                            <div>공유</div>
                        )}
                    </button>
                    
                    {isOwner && (ticket.status === 'owned' || ticket.status === 'sharing' || ticket.status === 'regular') && (
                        <button 
                            className={`flex items-center justify-center gap-2 h-10 px-5 text-[13px] font-bold rounded-lg transition-all duration-200 active:scale-[0.96] ${
                                ticket.status === 'sharing' 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                            onClick={handleToggleStatus}
                        >
                            {ticket.status === 'sharing' ? (
                                <div>취소</div>
                            ) : (
                                <div>나눔</div>
                            )}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        className="h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96]" 
                        onClick={onClose}
                    >
                        닫기
                    </button>
                    {canEdit && (
                        <button 
                            className="h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96]" 
                            onClick={() => { onClose(); onEditClick(ticket); }}
                        >
                            수정
                        </button>
                    )}
                </div>
            </div>

            <div className="flex justify-start px-1">
                {canDelete && (
                    <button 
                        className="text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 transition-all duration-200" 
                        onClick={handleDelete}
                    >
                        이 티켓을 삭제할까요?
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={ticket.title} footer={footer}>
            <div className="space-y-4" ref={contentRef}>
                {/* 공유 이미지에만 포함될 제목 (평소에는 숨김) */}
                <div className="share-title-only" style={{ display: 'none' }}>
                    <div className="px-2 pb-4 mb-4 border-b-2 border-slate-900">
                        <h2 className="text-2xl font-black text-slate-900">{ticket.title}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 px-2">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">상태</label>
                        <div className="text-m font-semibold text-foreground">{statusLabel}</div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">도착 공항</label>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const colors = getAirportColor(ticket.arrival_airport, rawAirports);
                                return (
                                    <span 
                                        className="px-2 py-0.5 rounded-full text-[12px] font-bold border" 
                                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                                    >
                                        {ticket.arrival_airport}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="col-span-2 pt-2 pb-2 border-y border-slate-100/50">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col items-start justify-center space-y-1.5 flex-1">
                                <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">출발 정보</label>
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">
                                        {ticket.departure_time || '-'}
                                    </span>
                                    <span className="text-[11px] font-bold text-muted-foreground pb-1 whitespace-nowrap">
                                        ({formatDate(ticket.departure_date)})
                                    </span>
                                </div>
                            </div>
                            
                            <div className="h-10 w-px bg-slate-100/80" />

                            <div className="flex flex-col items-start justify-center space-y-1.5 flex-1">
                                <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">도착 정보</label>
                                <div className="flex flex-col">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">
                                        {ticket.arrival_time || '-'}
                                    </span>
                                    <span className="text-[11px] font-bold text-muted-foreground pb-1 whitespace-nowrap">
                                        ({formatDate(ticket.arrival_date)})
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border-2 border-border/50">
                    <div className="space-y-1">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">항공사</label>
                        <div className="text-s font-semibold text-foreground">{ticket.airline || '-'}</div>
                    </div>
                    <div className="space-y-1 text-right">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">항공편</label>
                        <div className="text-s font-semibold text-foreground">{ticket.flight_info || '-'}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">기내</label>
                        <div className="text-s font-semibold text-foreground">{Number(ticket.cabin_capacity || 0)} 석</div>
                    </div>
                    <div className="space-y-1 text-right">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">수하물</label>
                        <div className="text-s font-semibold text-foreground">{Number(ticket.cargo_capacity || 0)} 석</div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 px-2">
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">소유자</label>
                        <div className="text-m font-semibold text-foreground">{ticket.owner?.name || ticket.manager_name || '-'}</div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">연락처</label>
                        <div className="text-m font-semibold text-foreground truncate share-email-target">{ticket.owner?.email || ticket.contact || '-'}</div>
                    </div>
                </div>

                {ticket.memo && (
                    <div className="space-y-1.5 pt-2 px-1">
                        <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground pl-1">메모</label>
                        <div className="text-sm leading-relaxed text-muted-foreground bg-accent/30 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">
                            {ticket.memo}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
