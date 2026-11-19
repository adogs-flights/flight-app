import { ActionLink, Badge, Button, FieldLabel, Heading } from '../ui/primitives.js';
import { Link } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { getAirportColor } from '../../utils/airportUtils';

// 공개 게시판용 읽기 전용 상세. 연락처·이메일은 표시하지 않으며 수정/삭제도 없다.
export default function PublicNeedPostDetailModal({ isOpen, onClose, post }) {
    const { rawAirports } = useAuth();

    if (!post) return null;

    // 이 게시글에 바로 티켓을 제출하는 링크. 게시글 소속 단체와 게시글 id를 넘긴다.
    const applyParams = new URLSearchParams();
    if (post.organization?.id) {
        applyParams.set('orgId', String(post.organization.id));
        applyParams.set('orgName', post.organization.name || '');
    }
    applyParams.set('postId', post.id);
    applyParams.set('postTitle', post.title || '');
    const applyUrl = `/apply?${applyParams.toString()}`;

    const formatDate = (dateString) => {
        if (!dateString) return '미정';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const footer = (
        <div className="flex items-center justify-end w-full border-t border-slate-100 pt-4">
            <Button
                variant="detailClose"
                onClick={onClose}
            >
                닫기
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="게시글 상세 정보" footer={footer}>
            <div className="space-y-6">
                {post.has_image && (
                    <img
                        src={`/api/need-posts/${post.id}/image`}
                        alt={post.title}
                        className="w-full max-h-80 object-cover rounded-xl border-2 border-border"
                    />
                )}
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

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">🤝</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">이 아이의 이동을 도와주시겠어요?</p>
                            <p className="text-sm font-bold text-foreground">
                                {post.organization?.name ? `${post.organization.name}에 ` : ''}이동봉사 티켓을 제출하면 담당자가 연락드립니다.
                            </p>
                        </div>
                    </div>
                    <ActionLink as={Link}
                        to={applyUrl}
                        onClick={onClose}
                        variant="publicNeedPostDetail"
                    >
                        🎫 이 게시글에 티켓 제출하기
                    </ActionLink>
                </div>
            </div>
        </Modal>
    );
}
