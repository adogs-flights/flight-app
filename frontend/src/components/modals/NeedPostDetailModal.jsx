import React from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';

export default function NeedPostDetailModal({ isOpen, onClose, post, onEditClick, onDeleteClick }) {
    const { user, rawAirports } = useAuth();

    if (!post) return null;

    const isAdmin = user.admin_info && user.admin_info.approved;
    const isAuthor = post.author_id === user.id;
    const canEdit = isAuthor || isAdmin;

    const formatDate = (dateString) => {
        if (!dateString) return '미정';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const footer = (
        <div className="flex flex-col w-full gap-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <button 
                        className="h-10 px-5 text-[13px] font-bold rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 transition-all duration-200 active:scale-[0.96]" 
                        onClick={onClose}
                    >
                        닫기
                    </button>
                    {canEdit && (
                        <button 
                            className="h-10 px-5 text-[13px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 active:scale-[0.96]" 
                            onClick={() => { onClose(); onEditClick(post); }}
                        >
                            수정하기
                        </button>
                    )}
                </div>
            </div>
            {canEdit && (
                <div className="flex justify-start px-1">
                    <button 
                        className="text-[11px] font-medium text-slate-400 hover:text-destructive underline underline-offset-4 transition-all duration-200" 
                        onClick={() => {
                            if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
                                onClose();
                                onDeleteClick(post.id);
                            }
                        }}
                    >
                        이 게시글을 삭제할까요?
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="게시글 상세 정보" footer={footer}>
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        {post.is_urgent && (
                            <span className="px-2 py-1 rounded-md text-[10px] font-black bg-destructive text-destructive-foreground animate-pulse shadow-sm">URGENT</span>
                        )}
                        <h2 className="text-xl font-black text-foreground tracking-tight">{post.title}</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">👤 {post.author?.name || '익명'}</span>
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">📅 {formatDate(post.created_at)} 등록</span>
                        {post.is_resolved && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">해결됨</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">희망 공항</label>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const colors = getAirportColor(post.airport_code, rawAirports);
                                return (
                                    <span 
                                        className="px-2.5 py-1 rounded-lg text-xs font-black border shadow-sm" 
                                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                                    >
                                        {post.airport_code}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">필요 좌석</label>
                        <div className="text-lg font-black text-foreground">
                            {post.seats_needed} <span className="text-sm font-bold text-muted-foreground">마리</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">희망 날짜</label>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm font-bold text-foreground">
                        🗓️ {formatDate(post.desired_date)}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1">상세 내용</label>
                    <div className="p-5 rounded-xl bg-background border-2 border-border/50 text-sm leading-relaxed text-foreground whitespace-pre-wrap min-h-[120px] shadow-inner">
                        {post.content || '내용이 없습니다.'}
                    </div>
                </div>

                {!isAuthor && (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">📞</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">도움 주실 분 연락처</p>
                            <p className="text-sm font-black text-foreground truncate">{post.author?.email || '연락처 정보가 없습니다.'}</p>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
