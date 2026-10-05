import { Badge, Button, FieldLabel, Heading } from '../ui/primitives.js';
import React from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';

export default function NeedPostDetailModal({ isOpen, onClose, post, onEditClick, onDeleteClick }) {
    const { user, rawAirports } = useAuth();

    if (!post) return null;

    const isAdmin = user?.role === 'admin';
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
                    <Button
                        variant="detailClose"
                        onClick={onClose}
                    >
                        닫기
                    </Button>
                    {canEdit && (
                        <Button
                            variant="detailEdit"
                            onClick={() => { onClose(); onEditClick(post); }}
                        >
                            수정하기
                        </Button>
                    )}
                </div>
            </div>
            {canEdit && (
                <div className="flex justify-start px-1">
                    <Button
                        variant="deleteText"
                        onClick={() => {
                            if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
                                onClose();
                                onDeleteClick(post.id);
                            }
                        }}
                    >
                        이 게시글을 삭제할까요?
                    </Button>
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
                            <Badge variant="needPostDetail">URGENT</Badge>
                        )}
                        <Heading as="h2" variant="needPostDetail">{post.title}</Heading>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">👤 {post.author?.name || '익명'}</span>
                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full">📅 {formatDate(post.created_at)} 등록</span>
                        {post.is_resolved && (
                            <Badge variant="needPostDetail2">해결됨</Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 space-y-1.5">
                        <FieldLabel variant="needPostDetail">희망 공항</FieldLabel>
                        <div className="flex items-center gap-2">
                            {(() => {
                                const colors = getAirportColor(post.airport_code, rawAirports);
                                return (
                                    <Badge
                                        variant="needPostDetail3"
                                        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.bg }}
                                    >
                                        {post.airport_code}
                                    </Badge>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-accent/30 border border-border/50 space-y-1.5">
                        <FieldLabel variant="needPostDetail">필요 좌석</FieldLabel>
                        <div className="text-lg font-black text-foreground">
                            {post.seats_needed} <span className="text-sm font-bold text-muted-foreground">마리</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <FieldLabel variant="needPostDetail2">희망 날짜</FieldLabel>
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-sm font-bold text-foreground">
                        🗓️ {formatDate(post.desired_date)}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <FieldLabel variant="needPostDetail2">상세 내용</FieldLabel>
                    <div className="p-5 rounded-xl bg-background border-2 border-border/50 text-sm leading-relaxed text-foreground whitespace-pre-wrap min-h-[120px] shadow-inner">
                        {post.detail || '내용이 없습니다.'}
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
